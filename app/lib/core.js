import * as THREE from 'three/webgpu'
import {  hdr } from '@/lib/utils/loader'
import * as Helpers from '@/lib/utils/helpers'
import { add_web_camera, stop_web_camera } from '@/lib/utils/ai/connect_camera'
import * as Detect from '@/lib/utils/ai/detections'
import { settings_glasses, settings } from '@/lib/settings'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

/*
 * IMPROVED MVP SYSTEM:
 * - MediaPipe Face Landmarker with facialTransformationMatrix for head pose
 * - Three.js scene layered on top of video
 * - Glasses anchored to head with proper positioning and rotation
 * - Smoothing for position, rotation, and scale
 * - Scale based on interpupillary distance
 */
let camera, scene, renderer, canvas
let is_running = true
// AI
let video, canvas_video, ctx, face_landmarker, results
let mode = 'VIDEO'
let lastTs = -1
let pendingDetection = null
let lastDetectionTimestamp = 0

// Performance optimization variables
let detectionCanvas = null
let detectionCtx = null
let isDetectionRunning = false
let lastFrameTime = 0
let targetFPS = 60
let frameInterval = 1000 / targetFPS
let lastMemoryCleanup = 0

// Glasses and anchor
let sunglassesModel = null
let anchor = null
let currentModelId = 1
let modelCache = new Map()
let modelBBoxWidth = 0

// Initialize settings GUI
if (process.client) {
  settings_glasses.show ? settings() : null
}

// === SMOOTHING: Simplified smoothing helper ===
class SmoothedValue {
  constructor(initialValue, type = 'scalar') {
    this.value = initialValue;
    this.type = type;
  }
  
  to(target, alpha) {
    if (alpha <= 0) return;
    
    switch (this.type) {
      case 'vector3':
        this.value.lerp(target, alpha);
        break;
      case 'quaternion':
        this.value.slerp(target, alpha);
        break;
      case 'scalar':
      default:
        this.value += (target - this.value) * alpha;
        break;
    }
  }
  
  get current() {
    return this.value;
  }
  
  set current(val) {
    this.value = val;
  }
}

// === NEW: measure model width (in model units) ===
function getModelWidth(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size.x; // width across X
}

// === PERFORMANCE: Create optimized detection canvas ===
function createDetectionCanvas() {
  if (detectionCanvas) return detectionCanvas;
  
  // Create a smaller canvas for face detection using settings
  const scaleFactor = settings_glasses.detectionResolutionScale || 0.5;
  detectionCanvas = document.createElement('canvas');
  detectionCtx = detectionCanvas.getContext('2d');
  
  // Set smaller dimensions for detection
  detectionCanvas.width = Math.floor((video?.videoWidth || 400) * scaleFactor);
  detectionCanvas.height = Math.floor((video?.videoHeight || 650) * scaleFactor);
  
  // Detection canvas created with optimized resolution
  
  return detectionCanvas;
}


// === PERFORMANCE: Non-blocking face detection with frame sync ===
async function runFaceDetectionAsync(canvas, timestamp) {
  if (isDetectionRunning) return null;
  
  isDetectionRunning = true;
  
  try {
    // Use setTimeout to yield control back to the main thread
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const detectionResults = await face_landmarker.detectForVideo(canvas, timestamp);
    
    // Store detection results with timestamp for frame synchronization
    if (detectionResults) {
      pendingDetection = {
        results: detectionResults,
        timestamp: timestamp,
        videoTime: video ? video.currentTime : 0
      };
    }
    
    return detectionResults;
  } catch (error) {
    console.error('Face detection error:', error);
    return null;
  } finally {
    isDetectionRunning = false;
  }
}

// === PERFORMANCE: Cached calculations ===
let cachedHeadEuler = new THREE.Euler();
let lastQuatHash = 0;

function getCachedHeadRotation(quat) {
  // Simple hash to check if quaternion changed significantly
  const quatHash = Math.floor(quat.x * 1000) + Math.floor(quat.y * 1000) + Math.floor(quat.z * 1000) + Math.floor(quat.w * 1000);
  
  if (quatHash !== lastQuatHash) {
    cachedHeadEuler.setFromQuaternion(quat);
    lastQuatHash = quatHash;
  }
  
  return cachedHeadEuler.y;
}

// === FRAME SYNC: Get synchronized detection results ===
function getSynchronizedDetection() {
  if (!pendingDetection) return null;
  
  const currentVideoTime = video ? video.currentTime : 0;
  const timeDiff = Math.abs(currentVideoTime - pendingDetection.videoTime);
  
  // Use detection if it's recent enough (within 100ms)
  if (timeDiff < 0.1) {
    const detection = pendingDetection.results;
    lastDetectionTimestamp = pendingDetection.timestamp;
    return detection;
  }
  
  return null;
}

// === MEMORY: Simplified object pooling ===
const vector3Pool = [];
const quaternionPool = [];
const matrix4Pool = [];

function getPooledVector3() {
  return vector3Pool.pop() || new THREE.Vector3();
}

function releaseVector3(vec) {
  vec.set(0, 0, 0);
  vector3Pool.push(vec);
}

function getPooledQuaternion() {
  return quaternionPool.pop() || new THREE.Quaternion();
}

function releaseQuaternion(quat) {
  quat.set(0, 0, 0, 1);
  quaternionPool.push(quat);
}

function getPooledMatrix4() {
  return matrix4Pool.pop() || new THREE.Matrix4();
}

function releaseMatrix4(matrix) {
  matrix.identity();
  matrix4Pool.push(matrix);
}


// === MEMORY: Memory management functions ===
function cleanupMemory() {
  // Clear object pools
  vector3Pool.length = 0;
  quaternionPool.length = 0;
  matrix4Pool.length = 0;
  
  // Clear model cache if it gets too large
  if (modelCache.size > 10) {
    modelCache.clear();
  }
  
  // Force garbage collection if available
  if (window.gc) {
    window.gc();
  }
}

// === MODEL LOADING: Simplified model loading ===
async function loadGlassesModel(modelId) {
  // Check if model is already cached
  if (modelCache.has(modelId)) {
    return modelCache.get(modelId);
  }
  
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')
  dracoLoader.setDecoderConfig({ type: 'js' })
  
  const loader = new GLTFLoader()
  loader.setDRACOLoader(dracoLoader)
  
  const modelPath = `/models/glasses${modelId}.glb`
  
  return new Promise((resolve, reject) => {
    loader.load(modelPath, (gltfScene) => {
      const model = gltfScene.scene
      
      // Basic model optimization
      model.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = true;
          if (child.geometry) {
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
          }
          if (child.material) {
            child.material.needsUpdate = false;
          }
        }
      });
      
      modelCache.set(modelId, model)
      resolve(model)
    }, undefined, (error) => {
      console.error('Error loading glasses model:', error)
      reject(error)
    })
  })
}

const smoothPos = new SmoothedValue(new THREE.Vector3(0,0,0), 'vector3');
const smoothRot = new SmoothedValue(new THREE.Quaternion(), 'quaternion');
const smoothScale = new SmoothedValue(1, 'scalar');

// === MOBILE: Simplified mobile detection and optimization ===
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function applyMobileOptimizations() {
  if (!settings_glasses.enableMobileOptimizations || !isMobile()) return;
  
  // Apply mobile-specific settings
  settings_glasses.detectionFrameSkip = 2; // Detect every 2nd frame
  settings_glasses.detectionResolutionScale = 0.6; // 60% resolution
  settings_glasses.mobileResolutionScale = 0.75; // 75% resolution
  settings_glasses.mobileFrameRate = 24; // 24fps
}

// Indices for key points (MediaPipe FaceMesh canonical)
const IDX_RIGHT_OUTER = 33;   // right eye outer
const IDX_LEFT_OUTER  = 263;  // left eye outer
const IDX_NOSE_TIP    = 4;    // nose tip
const IDX_LEFT_INNER = 133;   // left eye inner corner
const IDX_RIGHT_INNER = 362;  // right eye inner corner
const IDX_LEFT_ABOVE = 445;
const IDX_RIGHT_ABOVE = 225;
// === MEMORY: Use pooled objects instead of creating new ones ===
// These will be replaced with pooled objects in the render loop

// Correction from MediaPipe head frame to three.js
const correction = new THREE.Quaternion()
  .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0))); // flip Yaw 180°

async function init(canvas_id) {
  canvas = document.getElementById(canvas_id)
  
  scene = new THREE.Scene()
  
  // Store scene reference globally for camera restart
  if (typeof window !== 'undefined') {
    window.currentScene = scene;
  }
  
  camera = Helpers.init_perspective_camera({ canvas })
  camera.position.set(0, 0, 1.8)
  
  renderer = Helpers.init_renderer({ canvas })

  // NOTE: Settings to enable object reflection
  hdr.mapping = THREE.EquirectangularReflectionMapping
  scene.background = hdr.renderTarget
  // scene.background = hdr
  scene.environment = hdr
  
  // === MOBILE: Apply mobile optimizations on initialization ===
  applyMobileOptimizations();
  
  await add_model()
  
  window.addEventListener('resize', () => on_window_resize(), false)
  

  
  connect_ai_camera()
}

async function connect_ai_camera () {
  try {
    // Force portrait mode on ALL devices (mobile and desktop)
    if (screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock('portrait');
        console.log('Screen locked to portrait mode on ALL devices');
      } catch (error) {
        console.log('Could not lock orientation to portrait:', error);
      }
    }

    const { mesh, video_source } = await add_web_camera()
    scene.add(mesh)
    video = video_source

    // Create secondary canvas to flip video
    canvas_video = document.createElement('canvas')
    ctx = canvas_video.getContext('2d')
    
    // Set canvas dimensions to match video dimensions
    canvas_video.width = video.videoWidth
    canvas_video.height = video.videoHeight
    
    // Create optimized detection canvas
    createDetectionCanvas()

    // Force portrait dimensions for camera on ALL devices
    // This ensures consistent portrait experience across mobile and desktop
    const portraitWidth = 400;
    const portraitHeight = Math.round(portraitWidth * 1.625); // 1.5 aspect ratio
    
    camera = Helpers.init_ortografic_camera({ 
      width: portraitWidth, 
      height: portraitHeight
    })
    
    
    // Update renderer size to match portrait dimensions
    renderer.setSize(portraitWidth, portraitHeight)
    
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    
    // Initialize face landmarker
    face_landmarker = await Detect.faces(mode)

    is_loaded()
    __RAF()

  } catch (error) {
    console.error('Error initializing application:', error)
  }
}

function is_loaded () {
  const loading = document.getElementById('loading')
  if (loading) loading.style.display = 'none'
  
  makeResetFunctionGlobal()
}


// Function to switch glasses model
async function switchGlassesModel(modelId) {
  if (modelId === currentModelId) return
  
  try {
    // Switching to glasses model
    
    // Remove current model from anchor
    if (sunglassesModel && anchor) {
      anchor.remove(sunglassesModel)
    }
    
    // Load new model
    const newModel = await loadGlassesModel(modelId)
    
    if (newModel && anchor) {
      // Add new model to anchor
      sunglassesModel = newModel
      anchor.add(sunglassesModel)
      sunglassesModel.visible = true
      sunglassesModel.position.set(0, 0, 0)
      sunglassesModel.rotation.set(0, 0, 0)
      sunglassesModel.scale.setScalar(1.0)
      
      // Update model width for scaling calculations
      // modelBBoxWidth = Math.max(1e-6, getModelWidth(sunglassesModel))
      // New glasses model width cached
      
      currentModelId = modelId
      // Successfully switched to glasses model
    }
  } catch (error) {
    console.error('Error switching glasses model:', error)
  }
}

async function add_model () {
  console.log('Loading initial sunglasses model...')
  
  // Create anchor for head tracking
  anchor = new THREE.Object3D()
  scene.add(anchor)
  
  try {
    // Load the first model using our loadGlassesModel function
    const initialModel = await loadGlassesModel(1)
    
    if (initialModel) {
      sunglassesModel = initialModel
      anchor.add(sunglassesModel)
      sunglassesModel.visible = true
      sunglassesModel.position.set(0, 0, 0)
      sunglassesModel.rotation.set(0, 0, 0)
      sunglassesModel.scale.setScalar(1.0)
      
      // Cache the model width at scale=1
      modelBBoxWidth = Math.max(1e-6, getModelWidth(sunglassesModel))
      // Model width cached for scaling calculations
      
      // Initial sunglasses model loaded and anchored
      
      // Preload other models in background
      setTimeout(() => {
        [2, 3, 4, 5].forEach(id => loadGlassesModel(id));
      }, 2000);
      
    } else {
      console.error('Failed to load initial sunglasses model!')
    }
  } catch (error) {
    console.error('Error loading initial model:', error)
  }
}

// Compute distance between outer eye corners in normalized video space
function interpupillaryDistance(landmarks) {
  const a = landmarks[IDX_LEFT_OUTER];
  const b = landmarks[IDX_RIGHT_OUTER];
  if (!a || !b) return 1;
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy); // normalized [0..~0.2]
}

// === REPLACED: robust, device-independent scaling ===
// Inputs:
// - eyeDistanceNorm: normalized (0..1) distance between outer eye corners from MediaPipe
// - headRotationY: yaw (radians), from the facial quaternion
// - videoWidthPx: width in pixels of the video/canvas used for landmarks
// - modelWidthUnits: measured width of the glasses model in its own units (at scale 1)
// Notes:
// - frameToIpdRatio: how many "IPDs" wide the frame should appear. Typical eyewear outer width ~ 1.7–2.2 × IPD.
//   Start around 2.0 and tweak in settings.
function calculateRobustScale({
  eyeDistanceNorm,
  headRotationY = 0,
  videoWidthPx = 400,
  modelWidthUnits = 1,
}) {
  // defaults & settings
  const baseScale = settings_glasses.baseScaleMultiplier ?? 1.0; // kept for backwards compatibility (can be 1.0)
  const frameToIpdRatio = settings_glasses.frameToIpdRatio ?? 2.0; // tune in your GUI

  // 1) Convert normalized IPD → pixels (in our ortho world, pixels ~= world units)
  const ipdPx = Math.max(0, (eyeDistanceNorm || 0) * Math.max(1, videoWidthPx)); // e.g., ~0.2 * 400 = 80 px

  // 2) Compensate yaw (apparent IPD shrinks by cos(yaw)). Bound cos so we don't explode near profile.
  const absYaw = Math.abs(headRotationY);
  const cosYaw = Math.cos(Math.min(absYaw, 1.2)); // clamp to ~69°
  const safeCos = Math.max(0.6, cosYaw);          // never divide by a tiny number
  const ipdCompensatedPx = ipdPx / safeCos;

  // 3) Decide how wide the frame should be on the face (in pixels / world units)
  const targetFrameWidthPx = ipdCompensatedPx * frameToIpdRatio;

  // 4) Convert desired pixel width to a scale factor for the model
  let finalScale = (targetFrameWidthPx / Math.max(1e-6, modelWidthUnits)) * baseScale;

  // 5) Optional mobile boost (if you still want it)
  if (isMobile() && settings_glasses.mobileMultiplier) {
    finalScale *= settings_glasses.mobileMultiplier;
  }

  return finalScale;
}



// Compute nose target position on the video plane in world coords
function updateGlassesPosition(landmarks) {
  if (!landmarks || !camera) return null;

  // Use inner eye corners for more robust anchoring
  const leftInner = landmarks[IDX_LEFT_INNER];
  const rightInner = landmarks[IDX_RIGHT_INNER];
  const noseTip = landmarks[IDX_NOSE_TIP];
  
  if (!leftInner || !rightInner || !noseTip) return null;

  // Calculate midpoint between inner eye corners (more stable than outer corners)
  const cx = (leftInner.x + rightInner.x) / 2;
  const cy = (leftInner.y + rightInner.y) / 2;
  
  // Calculate IPD for proportional scaling
  const ipd = interpupillaryDistance(landmarks);
  
  // Offset downward proportionally to nose tip position
  // This creates a more natural anchor point that adapts to different face shapes
  const noseOffset = Math.abs(noseTip.y - cy) * 0.3; // 30% of the distance to nose tip
  
  const nx = cx;
  const ny = cy + noseOffset;

  // Map normalized image coords to world coords on the video plane (orthographic space)
  const worldX = (nx - 0.5) * (video?.videoWidth || canvas?.offsetWidth || 1);
  const worldY = (0.5 - ny) * (video?.videoHeight || canvas?.offsetHeight || 1);

  return new THREE.Vector3(worldX, worldY, 0);
}

function makeResetFunctionGlobal() {
  if (typeof window !== 'undefined') {
    window.switchGlassesModel = switchGlassesModel
    window.cleanupMemory = cleanupMemory
  }
}

async function __RAF () {
  if (!is_running) return

  const current_time = performance.now()
  const frameStartTime = current_time
  if (lastTs < 0) lastTs = current_time

  // === PERFORMANCE: Frame rate limiting ===
  if (current_time - lastFrameTime < frameInterval) {
    requestAnimationFrame(__RAF)
    return
  }
  lastFrameTime = current_time

  try {
    if (mode === 'VIDEO') {
      // Always draw the video for display (this is fast)
      ctx.save()
      ctx.clearRect(0, 0, canvas_video.width, canvas_video.height)
      ctx.translate(canvas_video.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas_video.width, canvas_video.height)
      ctx.restore()

      // === PERFORMANCE: Run face detection on every frame for maximum visual impact ===
      if (face_landmarker && !isDetectionRunning) {
        // Use lower resolution canvas for detection
        const detectionCanvas = createDetectionCanvas()
        
        // Draw video to detection canvas at lower resolution
        detectionCtx.save()
        detectionCtx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height)
        detectionCtx.translate(detectionCanvas.width, 0)
        detectionCtx.scale(-1, 1)
        detectionCtx.drawImage(video, 0, 0, detectionCanvas.width, detectionCanvas.height)
        detectionCtx.restore()

        // Run detection asynchronously without blocking the main thread
        runFaceDetectionAsync(detectionCanvas, current_time).catch(error => {
          console.error('Face detection error:', error)
        })
      }
    }

    // === FRAME SYNC: Get synchronized detection results ===
    const synchronizedResults = getSynchronizedDetection();
    
    // === PERFORMANCE: Only process results if we have them and anchor exists ===
    if (synchronizedResults && synchronizedResults.facialTransformationMatrixes && synchronizedResults.facialTransformationMatrixes.length && anchor) {
      const tmpMatrix = getPooledMatrix4();
      const tmpPos = getPooledVector3();
      const tmpQuat = getPooledQuaternion();
      const tmpScale = getPooledVector3();
      
      try {
        // 1) pose from transformation matrix
        const m = synchronizedResults.facialTransformationMatrixes[0].data;
        tmpMatrix.fromArray(m);
        tmpMatrix.decompose(tmpPos, tmpQuat, tmpScale);
        tmpQuat.multiply(correction);

        // 2) scale using robust device-adaptive scaling and anchor position from 2D nose target
        let scale = 1.0;
        if (synchronizedResults.faceLandmarks?.[0]) {
          const eyeDistance = interpupillaryDistance(synchronizedResults.faceLandmarks[0]);
          const headRotationY = getCachedHeadRotation(tmpQuat);
          
          scale = calculateRobustScale({
            eyeDistanceNorm: eyeDistance,
            headRotationY,
            videoWidthPx: canvas_video?.width || video?.videoWidth || 400,
            modelWidthUnits: modelBBoxWidth || 1,
          });
          
          const targetNose = updateGlassesPosition(synchronizedResults.faceLandmarks[0]);
          if (targetNose) {
            smoothPos.to(targetNose, settings_glasses.smoothing.pos);
            anchor.position.copy(smoothPos.current);
          }
        }

        // 3) smooth rotation and scale
        smoothRot.to(tmpQuat, settings_glasses.smoothing.rot);
        smoothScale.to(scale, settings_glasses.smoothing.scale);

        // 4) apply to anchor + child offsets
        anchor.quaternion.copy(smoothRot.current);
        anchor.scale.setScalar(smoothScale.current);
        
        anchor.position.copy(smoothPos.current);
        anchor.position.z += settings_glasses.depthOffset;
        
        if (sunglassesModel) {
          sunglassesModel.position.set(
            settings_glasses.offsetX,
            settings_glasses.offsetY,
            settings_glasses.offsetZ
          );
          sunglassesModel.rotation.y = settings_glasses.manualRotationY;
        }
        
      } finally {
        releaseMatrix4(tmpMatrix);
        releaseVector3(tmpPos);
        releaseQuaternion(tmpQuat);
        releaseVector3(tmpScale);
      }
    }

  } catch (error) {
    console.error('Error detecting face landmarks:', error)
  }

  // Always render (this should be fast)
  render()

  // Periodic memory cleanup
  const now = performance.now();
  if (now - lastMemoryCleanup > 30000) { // Every 30 seconds
    cleanupMemory();
    lastMemoryCleanup = now;
  }

  if (is_running) {
    requestAnimationFrame(__RAF)
  }
}

function START_RAF () {
  is_running = true
}

function STOP_RAF () {
  stop_web_camera()
  is_running = false
  results = null
  
  // === MEMORY: Cleanup on stop ===
  cleanupMemory()
}

function render () {
  renderer.renderAsync(scene, camera);
}

function on_window_resize() {
  if (video && video.videoWidth && video.videoHeight) {
    
    // Force portrait dimensions for camera on ALL devices
    const portraitWidth = 400;
    const portraitHeight = Math.round(portraitWidth * 1.625); // 1.5 aspect ratio
    
    // Update camera to maintain portrait dimensions
    camera.left = -portraitWidth / 2
    camera.right = portraitWidth / 2
    camera.top = portraitHeight / 2
    camera.bottom = -portraitHeight / 2
    camera.updateProjectionMatrix()
    
    // Update renderer size to match portrait dimensions
    renderer.setSize(portraitWidth, portraitHeight)
    
    // Center the canvas
    if (canvas) {
      canvas.style.width = portraitWidth + 'px'
      canvas.style.height = portraitHeight + 'px'
      
      // Center the canvas
    }
  } else {
    // Fallback for when video isn't loaded yet - still force portrait
    const portraitWidth = 400;
    const portraitHeight = Math.round(portraitWidth * 1.625);
    
    // Force portrait fallback on ALL devices
    camera.left = -portraitWidth / 2
    camera.right = portraitWidth / 2
    camera.top = portraitHeight / 2
    camera.bottom = -portraitHeight / 2
    camera.updateProjectionMatrix()
    
    renderer.setSize(portraitWidth, portraitHeight);
    if (canvas) {
      canvas.style.width = portraitWidth + 'px';
      canvas.style.height = portraitHeight + 'px';
    }
  }
}

export { 
  init,
  scene,
  camera,
  renderer,
  canvas,
  START_RAF, 
  STOP_RAF,
  makeResetFunctionGlobal,
  switchGlassesModel
}
