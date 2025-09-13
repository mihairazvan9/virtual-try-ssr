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
let video, faceLandmarker;
let mode = 'VIDEO';

// Performance
let lastVideoTime = -1;
let results = undefined;

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
    
    // Optimize video element for better performance
    video.style.imageRendering = 'pixelated'; // Faster rendering
    video.style.objectFit = 'cover'; // Better scaling

    camera = Helpers.init_ortografic_camera({ width: CAMERA_WIDTH, height: CAMERA_HEIGHT });
    renderer.setSize(CAMERA_WIDTH, CAMERA_HEIGHT);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.scale.x = -1;

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
function updateGlassesFromDetection(res) {
  if (!res?.facialTransformationMatrixes?.length || !anchor) return;
  
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
      videoWidthPx: video?.videoWidth || CAMERA_WIDTH,
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
// async function __RAF() {
//   if (!isRunning) return;

//   const startTimeMs = performance.now();
  
//   // Only detect when video frame changes (like the example)
//   if (lastVideoTime !== video.currentTime) {
//     // ctx.drawImage(video, 0, 0, canvas_video.width/0.1, canvas_video.height/0.1)
//     // lastVideoTime = video.currentTime;
//     // results = await faceLandmarker.detectForVideo(canvas_video, startTimeMs)
//     // ctx.restore()

//     lastVideoTime = video.currentTime;
//     results = faceLandmarker.detectForVideo(video, startTimeMs);
//     // Process detection results
//     if (results?.facialTransformationMatrixes?.length && anchor) {
//       updateGlassesFromDetection(results);
//     }
//   }

//   render();
//   if (isRunning) requestAnimationFrame(__RAF);
// }
let is_processing = false
let last_fps = 0
let fps = 60
async function __RAF () {
  
  if (!isRunning) return
  
  const current_time = performance.now()

  if (!is_processing && (current_time - last_fps > 1000 / fps)) {

    last_fps = current_time
    is_processing = true

    try {
      results = await faceLandmarker.detectForVideo(video, current_time)
      if (results?.facialTransformationMatrixes?.length && anchor) {
        updateGlassesFromDetection(results);
      }
    } catch (error) {
      console.error('Error detecting face landmarks:', error)
    } finally {
      is_processing = false
    }
  }

  render()

  if (isRunning) {
    requestAnimationFrame(__RAF)
  }
}

async function render() { 
  await renderer.renderAsync(scene, camera); 
}

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
    // Global functions can be added here if needed
  }
}


function START_RAF() { isRunning = true; }
function STOP_RAF() { stop_web_camera(); isRunning = false; }

export {
  init, scene, camera, renderer, canvas,
  START_RAF, STOP_RAF,
  makeResetFunctionGlobal
};
