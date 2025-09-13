import * as THREE from 'three/webgpu'

let stream

// === CAMERA: Optimized constraints for better performance ===
function getPortraitConstraints() {
  const isMobileDevice = isMobile();
  
  if (isMobileDevice) {
    return {
      video: {
        width: { min: 320, ideal: 480, max: 640 }, // Reduced max for mobile
        height: { min: 480, ideal: 720, max: 960 }, // Reduced max for mobile
        facingMode: 'user',
        aspectRatio: { min: 1.2, ideal: 1.5, max: 2.0 },
        frameRate: { min: 15, ideal: 30, max: 60 }, // Reduced frame rate for mobile
        // Additional mobile optimizations
        resizeMode: 'crop-and-scale',
        whiteBalanceMode: 'continuous',
        exposureMode: 'continuous',
        focusMode: 'continuous'
      },
    };
  } else {
    return {
      video: {
        width: { min: 320, ideal: 640, max: 1280 },
        height: { min: 480, ideal: 960, max: 1920 },
        facingMode: 'user',
        aspectRatio: { min: 1.2, ideal: 1.5, max: 2.0 },
        frameRate: { min: 15, ideal: 30, max: 60 }, // Capped at 30fps for performance
        // Desktop optimizations
        resizeMode: 'crop-and-scale',
        whiteBalanceMode: 'continuous',
        exposureMode: 'continuous',
        focusMode: 'continuous'
      },
    };
  } 
}

// === CAMERA: Performance-optimized fallback constraints ===
function getFallbackConstraints() {
  return {
    video: {
      facingMode: 'user',
      width: { min: 320, ideal: 480, max: 640 },
      height: { min: 480, ideal: 720, max: 960 },
      frameRate: { min: 15, ideal: 30, max: 60 }
    }
  };
}

async function add_web_camera() {

  const video_source = document.createElement('video')
  video_source.setAttribute('id', 'video')
  video_source.style.display = 'none'
  video_source.setAttribute('autoplay', true)
  video_source.setAttribute('muted', true)
  video_source.setAttribute('playsinline', true)
  document.body.appendChild(video_source)

  return new Promise((resolve, reject) => {

    video_source.addEventListener('loadedmetadata', function() {
      // Ensure the video dimensions are available
      const texture = new THREE.VideoTexture(video_source)
      texture.colorSpace = THREE.SRGBColorSpace

      // Create geometry based on actual video dimensions
      // This ensures the video plane matches the camera output exactly
      const geometry = new THREE.PlaneGeometry(
        video_source.videoWidth,
        video_source.videoHeight
      )

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(geometry, material)
      
      console.log('Video setup (Portrait Mode):', {
        videoWidth: video_source.videoWidth,
        videoHeight: video_source.videoHeight,
        aspectRatio: video_source.videoWidth / video_source.videoHeight,
        isMobile: isMobile(),
        forcedPortrait: true
      });
      
      resolve({ mesh, video_source })
      
    })
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

      // Force portrait constraints on ALL devices
      let constraints = getPortraitConstraints();

      // === CAMERA: Optimized constraint fallback system ===
      const tryConstraints = async (constraintSet) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraintSet);
          return stream;
        } catch (error) {
          return null;
        }
      };

      // === CAMERA: Progressive constraint fallback with performance priority ===
      const tryMultipleConstraints = async () => {
        // First try: Optimized portrait constraints
        let stream = await tryConstraints(constraints);
        if (stream) return stream;

        // Second try: Fallback constraints (lower resolution)
        stream = await tryConstraints(getFallbackConstraints());
        if (stream) return stream;

        // Third try: Basic constraints with minimal requirements
        const basicConstraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 320 },
            height: { ideal: 480 }
          }
        };
        stream = await tryConstraints(basicConstraints);
        if (stream) return stream;

        // Last resort: Any camera with minimal settings
        const anyConstraints = {
          video: {
            facingMode: 'user'
          }
        };
        stream = await tryConstraints(anyConstraints);
        if (stream) return stream;

        throw new Error('No camera constraints worked');
      };

      tryMultipleConstraints()
        .then(stream => {
          video_source.srcObject = stream
          video_source.play()
          // video_source.style.transform = 'scaleX(-1)';
        })
        .catch(error => {
          console.error('Unable to access the camera/webcam.', error)
          reject(error)
        })

    } else {
      reject(new Error('MediaDevices interface not available.'))

    }

  })

}

function stop_web_camera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  const video_source = document.getElementById('video')

  if (video_source) {
    video_source.pause()
    video_source.srcObject = null
    video_source.remove()
  }
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export {
  add_web_camera,
  stop_web_camera,
  isMobile
}