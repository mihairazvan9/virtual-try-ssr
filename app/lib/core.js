import * as THREE from 'three/webgpu';
import { hdr } from '@/lib/utils/loader';
import * as Helpers from '@/lib/utils/helpers';
import { add_web_camera, stop_web_camera } from '@/lib/utils/ai/connect_camera';
import * as Detect from '@/lib/utils/ai/detections';
import { settings_glasses, settings } from '@/lib/settings';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

/*
 * MVP SYSTEM:
 * - MediaPipe Face Landmarker with transformation matrix
 * - Three.js scene layered on top of mirrored video
 * - Glasses anchored to head with smoothed position, rotation, scale
 * - Scale from interpupillary distance (IPD)
 */

let camera, scene, renderer, canvas;
let isRunning = true;

// AI
let video, canvasVideo, ctx, faceLandmarker;
let mode = 'VIDEO';
let lastTs = -1;
let pendingDetection = null;
let lastDetectionTimestamp = 0;

// Performance
let detectionCanvas, detectionCtx, isDetectionRunning = false;
let lastFrameTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;
let lastMemoryCleanup = 0;

// Glasses
let sunglassesModel = null;
let anchor = null;
let modelBBoxWidth = 0;

// GUI
if (process.client) settings_glasses.show && settings();

// === Smoothing ===
class SmoothedValue {
  constructor(initialValue, type = 'scalar') {
    this.value = initialValue;
    this.type = type;
  }
  to(target, alpha) {
    if (alpha <= 0) return;
    if (this.type === 'vector3') this.value.lerp(target, alpha);
    else if (this.type === 'quaternion') this.value.slerp(target, alpha);
    else this.value += (target - this.value) * alpha;
  }
  get current() { return this.value; }
  set current(val) { this.value = val; }
}
const smoothPos = new SmoothedValue(new THREE.Vector3(0, 0, 0), 'vector3');
const smoothRot = new SmoothedValue(new THREE.Quaternion(), 'quaternion');
const smoothScale = new SmoothedValue(1, 'scalar');

// === Landmarks indices ===
const IDX = {
  RIGHT_OUTER: 33,
  LEFT_OUTER: 263,
  NOSE_TIP: 4,
  LEFT_INNER: 133,
  RIGHT_INNER: 362,
};

// === Tmp pooled objects ===
const _tmpVecA = new THREE.Vector3();
const _tmpVecB = new THREE.Vector3();
const _tmpVecC = new THREE.Vector3();
const _tmpQuatA = new THREE.Quaternion();
const _tmpMatA = new THREE.Matrix4();

const correction = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));

// === Pools ===
const vector3Pool = [], quaternionPool = [], matrix4Pool = [];
const getVec3 = () => vector3Pool.pop() || new THREE.Vector3();
const putVec3 = (v) => { v.set(0, 0, 0); vector3Pool.push(v); };
const getQuat = () => quaternionPool.pop() || new THREE.Quaternion();
const putQuat = (q) => { q.identity(); quaternionPool.push(q); };
const getMat4 = () => matrix4Pool.pop() || new THREE.Matrix4();
const putMat4 = (m) => { m.identity(); matrix4Pool.push(m); };

function cleanupMemory() {
  vector3Pool.length = 0;
  quaternionPool.length = 0;
  matrix4Pool.length = 0;
}

// === Global Constants ===
const CAMERA_WIDTH = 400;
const CAMERA_HEIGHT = 650;

// === Init ===
async function init(canvasId) {
  canvas = document.getElementById(canvasId);
  scene = new THREE.Scene();
  if (typeof window !== 'undefined') window.currentScene = scene;

  camera = Helpers.init_perspective_camera({ canvas });
  camera.position.set(0, 0, 1.8);
  renderer = Helpers.init_renderer({ canvas });

  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = hdr.renderTarget;
  scene.environment = hdr;

  await addModel();
  window.addEventListener('resize', onResize, false);
  connectAICamera();
}

// === Camera + AI ===
async function connectAICamera() {
  try {
    if (screen.orientation?.lock) {
      try { await screen.orientation.lock('portrait'); }
      catch (e) { console.log('Orientation lock failed:', e); }
    }

    const { mesh, video_source } = await add_web_camera();
    scene.add(mesh);
    video = video_source;

    canvasVideo = document.createElement('canvas');
    ctx = canvasVideo.getContext('2d');
    canvasVideo.width = video.videoWidth;
    canvasVideo.height = video.videoHeight;

    createDetectionCanvas();

    camera = Helpers.init_ortografic_camera({ width: CAMERA_WIDTH, height: CAMERA_HEIGHT });
    renderer.setSize(CAMERA_WIDTH, CAMERA_HEIGHT);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    faceLandmarker = await Detect.faces(mode);

    isLoaded();
    __RAF();
  } catch (e) {
    console.error('Error initializing:', e);
  }
}

function isLoaded() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  makeResetFunctionGlobal();
}

// === Model loading ===
async function loadGlassesModel() {
  const draco = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'js' });
  const loader = new GLTFLoader().setDRACOLoader(draco);

  return new Promise((resolve, reject) => {
    loader.load('/models/glasses1.glb', (gltf) => {
      const model = gltf.scene;
      model.traverse((c) => {
        if (c.isMesh) {
          c.frustumCulled = true;
          c.geometry?.computeBoundingBox();
          c.geometry?.computeBoundingSphere();
        }
      });
      resolve(model);
    }, undefined, reject);
  });
}

async function addModel() {
  anchor = new THREE.Object3D();
  scene.add(anchor);

  try {
    const model = await loadGlassesModel();
    if (!model) throw new Error('Model failed to load');
    sunglassesModel = model;
    anchor.add(model);
    modelBBoxWidth = getModelWidth(model);

  } catch (e) { console.error(e); }
}

function getModelWidth(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size.x;
}

// === Detection ===
function createDetectionCanvas() {
  const scale = settings_glasses.detectionResolutionScale || 0.5;
  const vw = video?.videoWidth || CAMERA_WIDTH;
  const vh = video?.videoHeight || CAMERA_HEIGHT;
  const w = Math.floor(vw * scale), h = Math.floor(vh * scale);

  if (detectionCanvas && (detectionCanvas.width !== w || detectionCanvas.height !== h)) {
    detectionCanvas.width = w;
    detectionCanvas.height = h;
  }
  if (!detectionCanvas) {
    detectionCanvas = document.createElement('canvas');
    detectionCtx = detectionCanvas.getContext('2d');
    detectionCanvas.width = w;
    detectionCanvas.height = h;
  }
  return detectionCanvas;
}

async function runFaceDetectionAsync(canvas, ts) {
  if (isDetectionRunning || !faceLandmarker) return null;
  isDetectionRunning = true;
  try {
    await new Promise(r => setTimeout(r, 0));
    const res = await faceLandmarker.detectForVideo(canvas, ts);
    if (res) pendingDetection = { results: res, timestamp: ts, videoTime: video?.currentTime || 0 };
    return res;
  } catch (e) {
    console.error('Detection error:', e);
    return null;
  } finally { isDetectionRunning = false; }
}

function getSynchronizedDetection() {
  if (!pendingDetection) return null;
  const diff = Math.abs((video?.currentTime || 0) - pendingDetection.videoTime);
  if (diff < 0.1) {
    lastDetectionTimestamp = pendingDetection.timestamp;
    return pendingDetection.results;
  }
  return null;
}

// === Geometry helpers ===
function interpupillaryDistance(lm) {
  const a = lm[IDX.LEFT_OUTER], b = lm[IDX.RIGHT_OUTER];
  if (!a || !b) return 1;
  _tmpVecA.set(a.x, a.y, 0);
  _tmpVecB.set(b.x, b.y, 0);
  return _tmpVecA.distanceTo(_tmpVecB);
}

function calculateRobustScale({ eyeDistanceNorm, headRotationY = 0, videoWidthPx = CAMERA_WIDTH, modelWidthUnits = 1 }) {
  const base = settings_glasses.baseScaleMultiplier ?? 1.0;
  const ratio = settings_glasses.frameToIpdRatio ?? 2.0;
  const ipdPx = (eyeDistanceNorm || 0) * videoWidthPx;
  const cosYaw = Math.max(0.6, Math.cos(Math.min(Math.abs(headRotationY), 1.2)));
  const targetWidth = (ipdPx / cosYaw) * ratio;
  let scale = (targetWidth / Math.max(1e-6, modelWidthUnits)) * base;
  if (isMobile() && settings_glasses.mobileMultiplier) scale *= settings_glasses.mobileMultiplier;
  return scale;
}

function updateGlassesPosition(lm, target = null) {
  if (!lm) return null;
  const li = lm[IDX.LEFT_INNER], ri = lm[IDX.RIGHT_INNER], nose = lm[IDX.NOSE_TIP];
  if (!li || !ri || !nose) return null;

  _tmpVecA.set(li.x, li.y, 0);
  _tmpVecB.set(ri.x, ri.y, 0);
  const cx = (li.x + ri.x) * 0.5;
  const cy = (li.y + ri.y) * 0.5;
  const ny = cy + Math.abs(nose.y - cy) * 0.3;

  const vw = video?.videoWidth || canvas?.offsetWidth || 1;
  const vh = video?.videoHeight || canvas?.offsetHeight || 1;
  const worldX = (cx - 0.5) * vw;
  const worldY = (0.5 - ny) * vh;

  if (target) return target.set(worldX, worldY, 0);
  return new THREE.Vector3(worldX, worldY, 0);
}

// === RAF loop ===
async function __RAF() {
  if (!isRunning) return;

  const now = performance.now();
  if (lastTs < 0) lastTs = now;
  if (now - lastFrameTime < frameInterval) return requestAnimationFrame(__RAF);
  lastFrameTime = now;

  try {
    if (mode === 'VIDEO') {
      // ctx.save();
      // ctx.clearRect(0, 0, canvasVideo.width, canvasVideo.height);
      // ctx.translate(canvasVideo.width, 0);
      // ctx.scale(-1, 1);
      // ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
      // ctx.restore();

      if (faceLandmarker && !isDetectionRunning) {
        const dCanvas = createDetectionCanvas();
        const dCtx = detectionCtx;
        dCtx.save();
        dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
        dCtx.translate(dCanvas.width, 0);
        dCtx.scale(-1, 1);
        dCtx.drawImage(video, 0, 0, dCanvas.width, dCanvas.height);
        dCtx.restore();
        runFaceDetectionAsync(dCanvas, now).catch(console.error);
      }
    }

    const res = getSynchronizedDetection();
    if (res?.facialTransformationMatrixes?.length && anchor) {
      const m = res.facialTransformationMatrixes[0].data;
      const tmpM = getMat4().fromArray(m);
      const tmpP = getVec3();
      const tmpQ = getQuat();
      const tmpS = getVec3();
      tmpM.decompose(tmpP, tmpQ, tmpS);
      tmpQ.multiply(correction);

      let scale = 1;
      if (res.faceLandmarks?.[0]) {
        const ipd = interpupillaryDistance(res.faceLandmarks[0]);
        const yaw = new THREE.Euler().setFromQuaternion(tmpQ).y;
        scale = calculateRobustScale({
          eyeDistanceNorm: ipd,
          headRotationY: yaw,
          videoWidthPx: canvasVideo?.width || CAMERA_WIDTH,
          modelWidthUnits: modelBBoxWidth || 1,
        });

        const nose = updateGlassesPosition(res.faceLandmarks[0], tmpP);
        if (nose) smoothPos.to(nose, settings_glasses.smoothing.pos);
        anchor.position.copy(smoothPos.current);
      }

      smoothRot.to(tmpQ, settings_glasses.smoothing.rot);
      smoothScale.to(scale, settings_glasses.smoothing.scale);
      anchor.quaternion.copy(smoothRot.current);
      anchor.scale.setScalar(smoothScale.current);
      anchor.position.z += settings_glasses.depthOffset;

      if (sunglassesModel) {
        sunglassesModel.position.set(settings_glasses.offsetX, settings_glasses.offsetY, settings_glasses.offsetZ);
        sunglassesModel.rotation.y = settings_glasses.manualRotationY;
      }

      putMat4(tmpM); putVec3(tmpP); putQuat(tmpQ); putVec3(tmpS);
    }
  } catch (e) { console.error(e); }

  render();
  if (now - lastMemoryCleanup > 30000) lastMemoryCleanup = now;
  if (isRunning) requestAnimationFrame(__RAF);
}

function render() { renderer.renderAsync(scene, camera); }

function onResize() {
  const w = CAMERA_WIDTH, h = CAMERA_HEIGHT;
  camera.left = -w / 2; camera.right = w / 2;
  camera.top = h / 2; camera.bottom = -h / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  if (canvas) { canvas.style.width = `${w}px`; canvas.style.height = `${h}px`; }
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function makeResetFunctionGlobal() {
  if (typeof window !== 'undefined') {
    window.cleanupMemory = cleanupMemory;
  }
}


function START_RAF() { isRunning = true; }
function STOP_RAF() { stop_web_camera(); isRunning = false; cleanupMemory(); }

export {
  init, scene, camera, renderer, canvas,
  START_RAF, STOP_RAF,
  makeResetFunctionGlobal
};
