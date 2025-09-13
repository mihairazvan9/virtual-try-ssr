import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Cache for MediaPipe components to avoid re-downloading WASM files
let cached_vision = null
let cached_face_landmarker = null

async function faces (mode = 'VIDEO') {
  // Check if we already have a cached face landmarker
  if (cached_face_landmarker) {
    console.log('Using cached MediaPipe FaceLandmarker - no WASM download needed')
    return cached_face_landmarker
  }

  const create_face_landmarker = async () => {
    // Check if we already have a cached vision resolver
    if (!cached_vision) {
      console.log('Loading MediaPipe WASM files...')
      cached_vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        // 'https://unpkg.com/@mediapipe/tasks-vision/wasm'
      )
      console.log('MediaPipe WASM files loaded and cached')
    } else {
      console.log('Using cached MediaPipe vision resolver - no WASM download needed')
    }
    
    const face_landmarker = await FaceLandmarker.createFromOptions(cached_vision, {
      baseOptions: {
        modelAssetPath: `/face_landmarker.task`,
        delegate: 'GPU'
      },
      runningMode: mode, 
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true, // <-- we use this for head pose
      // outputFaceLandmarks: true // also handy for scale/anchor
    })

    return face_landmarker
  }

  const face_landmarker = await create_face_landmarker()
  
  // Cache the face landmarker for future use
  cached_face_landmarker = face_landmarker
  console.log('MediaPipe FaceLandmarker created and cached')
  
  return face_landmarker
}

// Function to clear the MediaPipe cache (useful for debugging or forcing reload)
function clearMediaPipeCache() {
  console.log('Clearing MediaPipe cache...')
  cached_vision = null
  cached_face_landmarker = null
}

export { faces, clearMediaPipeCache }
