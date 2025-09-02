import * as THREE from 'three/webgpu'
import { model, hdr } from '@/lib/utils/loader'
import * as Helpers from '@/lib/utils/helpers'
import { add_web_camera, stop_web_camera } from '@/lib/utils/ai/connect_camera'
import * as Detect from '@/lib/utils/ai/detections'
import { settings_glasses, settings } from '@/lib/settings'

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

// Glasses and anchor
let sunglassesModel = null
let anchor = null
let fitted = false

// === NEW: globals for model sizing ===
let modelBBoxWidth = 0;  // width (X) of glasses model in its local units at scale 1

// Initialize settings GUI
settings_glasses.show ? settings() : null

// Generic smoothing helper that can handle vectors, quaternions, and scalars
class SmoothedValue {
  constructor(initialValue, type = 'scalar') {
    this.value = initialValue;
    this.type = type;
    
    // Helper method for linear interpolation
    this.lerp = (a, b, t) => a + (b - a) * t;
  }
  
  to(target, alpha) {
    switch (this.type) {
      case 'vector3':
        // Handle Vector3 with component-wise lerp
        this.value.set(
          this.lerp(this.value.x, target.x, alpha),
          this.lerp(this.value.y, target.y, alpha),
          this.lerp(this.value.z, target.z, alpha)
        );
        break;
        
      case 'quaternion':
        // Handle Quaternion with slerp
        this.value.slerp(target, alpha);
        break;
        
      case 'scalar':
      default:
        // Handle scalar values with lerp
        this.value = this.lerp(this.value, target, alpha);
        break;
    }
  }
  
  // Getter for the current value
  get current() {
    return this.value;
  }
  
  // Setter for the current value
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

const smoothPos = new SmoothedValue(new THREE.Vector3(0,0,0), 'vector3');
const smoothRot = new SmoothedValue(new THREE.Quaternion(), 'quaternion');
const smoothScale = new SmoothedValue(1, 'scalar');

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Indices for key points (MediaPipe FaceMesh canonical)
const IDX_RIGHT_OUTER = 33;   // right eye outer
const IDX_LEFT_OUTER  = 263;  // left eye outer
const IDX_NOSE_TIP    = 4;    // nose tip
const IDX_LEFT_INNER = 133;   // left eye inner corner
const IDX_RIGHT_INNER = 362;  // right eye inner corner
const IDX_LEFT_ABOVE = 445;
const IDX_RIGHT_ABOVE = 225;
// Temporary objects for calculations
const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();

// Correction from MediaPipe head frame to three.js
const correction = new THREE.Quaternion()
  .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0))); // flip Yaw 180°

function init(canvas_id) {
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
  
  // add_lights()
  add_model()
  
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

function add_model () {
  console.log('Adding sunglasses model to scene:', model)
  
  // Create anchor for head tracking
  anchor = new THREE.Object3D()
  scene.add(anchor)
  
  // Add sunglasses as child of anchor
  sunglassesModel = model
  if (sunglassesModel) {
    anchor.add(sunglassesModel)
    sunglassesModel.visible = true
    sunglassesModel.position.set(0, 0.02, 0.02) // forward a bit, up a bit
    sunglassesModel.rotation.set(0, 0, 0)
    sunglassesModel.scale.setScalar(1.0)
    
    // === NEW: cache the model width at scale=1 ===
    modelBBoxWidth = Math.max(1e-6, getModelWidth(sunglassesModel))
    console.log('Glasses model width (units):', modelBBoxWidth)
    
    console.log('Sunglasses model added and anchored')
  } else {
    console.error('Sunglasses model is null!')
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

function add_lights () {
  const light = new THREE.AmbientLight(0xffffff, 1)
  scene.add(light)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(0, 1, 1)
  scene.add(directionalLight)
}

function makeResetFunctionGlobal() {
  if (typeof window !== 'undefined') {
    console.log('Reset function made globally accessible')
  }
}

async function __RAF () {
  if (!is_running) return

  const current_time = performance.now()
  if (lastTs < 0) lastTs = current_time

  try {
    if (mode === 'VIDEO') {
      ctx.save()
      ctx.clearRect(0, 0, canvas_video.width, canvas_video.height)
      ctx.translate(canvas_video.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas_video.width, canvas_video.height)

      // Run the model at video frametimestamps for better sync
      results = await face_landmarker.detectForVideo(canvas_video, current_time)
      ctx.restore()
    }

    if (results && results.facialTransformationMatrixes && results.facialTransformationMatrixes.length) {
      // 1) pose from transformation matrix
      const m = results.facialTransformationMatrixes[0].data; // 16 floats
      tmpMatrix.fromArray(m);
      tmpMatrix.decompose(tmpPos, tmpQuat, tmpScale);
      // apply correction (aligns your model's forward/up with head)
      tmpQuat.multiply(correction);

      // 2) scale using robust device-adaptive scaling and anchor position from 2D nose target
      let scale = 1.0;
      if (results.faceLandmarks?.[0]) {
        const eyeDistance = interpupillaryDistance(results.faceLandmarks[0]);
        
        // Extract head rotation from the facial transformation matrix
        // Convert quaternion to euler angles to get Y rotation (head turning left/right)
        const headEuler = new THREE.Euler().setFromQuaternion(tmpQuat);
        const headRotationY = headEuler.y; // This represents head turning left/right
        
        // // Debug: Log rotation information
        // if (Math.abs(headRotationY) > 0.1) {
        //   const rotationDegrees = (headRotationY * 180 / Math.PI).toFixed(1)
        //   const isProfileView = Math.abs(headRotationY) > 0.5 // More than ~30 degrees
          
        //   console.log(`Head rotation: ${rotationDegrees}° ${isProfileView ? '(PROFILE VIEW)' : '(Slight turn)'}`, {
        //     yaw: headRotationY,
        //     degrees: rotationDegrees,
        //     eyeDistance: eyeDistance,
        //     compensationEnabled: settings_glasses.rotationCompensationEnabled
        //   });
        // }
        
        // === UPDATED: pass video width & measured model width ===
        scale = calculateRobustScale({
          eyeDistanceNorm: eyeDistance,
          headRotationY,
          videoWidthPx: canvas_video?.width || video?.videoWidth || 400,
          modelWidthUnits: modelBBoxWidth || 1,
        });
        
        // Compute nose target on video plane and drive anchor position with smoothing
        const targetNose = updateGlassesPosition(results.faceLandmarks[0]);
        if (targetNose) {
          smoothPos.to(targetNose, settings_glasses.smoothing.pos);
          anchor.position.copy(smoothPos.current);
        }
      }

      // 3) smooth rotation and scale; position already handled by nose target
      smoothRot.to(tmpQuat, settings_glasses.smoothing.rot);
      smoothScale.to(scale, settings_glasses.smoothing.scale);

      // 4) apply to anchor + child offsets
      anchor.quaternion.copy(smoothRot.current);
      anchor.scale.setScalar(smoothScale.current);
      
      // Apply depth offset to anchor position in world space (before rotation)
      // Reset to base position first, then add depth offset
      anchor.position.copy(smoothPos.current);
      anchor.position.z += settings_glasses.depthOffset;
      
      // Apply manual Y rotation override
      if (sunglassesModel) {
        // Apply local offsets so the frame can be aligned to ears and nose
        sunglassesModel.position.set(
          settings_glasses.offsetX,
          settings_glasses.offsetY,
          settings_glasses.offsetZ
        );
        sunglassesModel.rotation.y = settings_glasses.manualRotationY;
      }
    }

  } catch (error) {
    console.error('Error detecting face landmarks:', error)
  }

  render()

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
  makeResetFunctionGlobal
}
