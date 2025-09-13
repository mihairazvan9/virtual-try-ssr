import GUI from 'lil-gui'


// ---------- config ----------
const SMOOTHING = { 
  pos: 0.8, 
  rot: 0.8, 
  scale: 0.35, 
}; // [0..1], higher = snappier

// Settings
let settings_glasses = {
  show: true,
  mobileMultiplier: 1, // Increased for better mobile scaling
  baseScaleMultiplier: 1, // Increased for better mobile scaling
  manualRotationY: 3.14,
  // Local offsets of the glasses relative to the head anchor (in orthographic world units)
  offsetX: 0,
  offsetY: 4,
  offsetZ: 46,
  depthOffset: 86, // Depth offset for glasses positioning
  // Head rotation compensation settings
  rotationCompensationEnabled: true, // Enable/disable rotation compensation
  rotationCompensationStrength: 0.15, // How much to compensate for rotation (0.0 to 2.0) - gentle since cos() already helps
  rotationCompensationThreshold: 0.15, // Minimum rotation angle to start compensation (~9°)
  // === NEW: Improved IPD-based scaling settings ===
  frameToIpdRatio: 1.6, // How many "IPDs" wide the frame should appear (1.8-2.2 typical)
  // === PERFORMANCE: Detection optimization settings ===
  detectionFrameSkip: 2, // Detect every Nth frame (2 = 30fps detection on 60fps display)
  detectionResolutionScale: 0.5, // Scale factor for detection canvas (0.5 = 50% resolution)
  adaptiveDetection: true, // Enable adaptive detection based on head movement
  headMovementThreshold: 0.01, // Threshold for significant head movement
  // === MEMORY: Memory optimization settings ===
  enableObjectPooling: true, // Enable object pooling to reduce garbage collection
  memoryCleanupInterval: 30000, // Memory cleanup interval in milliseconds (30 seconds)
  maxModelCacheSize: 10, // Maximum number of models to cache
  // === CAMERA: Camera optimization settings ===
  cameraResolutionScale: 1.0, // Scale factor for camera resolution (0.5 = 50% resolution)
  cameraFrameRate: 30, // Target camera frame rate
  enableCameraOptimization: true, // Enable camera-specific optimizations
  // === MOBILE: Mobile-specific optimization settings ===
  mobileOptimizationLevel: 'auto', // 'auto', 'low', 'high', 'desktop'
  mobileFrameRate: 24, // Target frame rate for mobile devices
  mobileResolutionScale: 0.75, // Resolution scale for mobile devices
  enableMobileOptimizations: true, // Enable mobile-specific optimizations
  lowEndMobileMode: false, // Force low-end mobile optimizations
  // Fine-tuning for different measurement methods
  smoothing: { ...SMOOTHING }
}

function settings () {
  let gui = new GUI()
  gui.close()
  let sunglassesFolder = gui.addFolder('Sunglasses Positioning')
  
  sunglassesFolder.add(settings_glasses, 'mobileMultiplier', 0.1, 5.0, 0.1).name('Mobile Scale Multiplier')
  sunglassesFolder.add(settings_glasses, 'baseScaleMultiplier', 0.1, 2.0, 0.1).name('Base Scale Multiplier')
  sunglassesFolder.add(settings_glasses, 'frameToIpdRatio', 1.5, 3.0, 0.1).name('Frame to IPD Ratio')
  sunglassesFolder.add(settings_glasses, 'offsetX', -200, 200, 1).name('Offset X (px)')
  sunglassesFolder.add(settings_glasses, 'offsetY', -200, 200, 1).name('Offset Y (px)')
  sunglassesFolder.add(settings_glasses, 'offsetZ', -100, 100, 1).name('Offset Z')
  sunglassesFolder.add(settings_glasses, 'depthOffset', -100, 100, 1).name('Depth Offset')
  
  // Face-based scaling settings
  let smoothingFolder = gui.addFolder('Smoothing')
  smoothingFolder.add(settings_glasses.smoothing, 'pos', 0.1, 0.9, 0.05).name('Position Smoothing')
  smoothingFolder.add(settings_glasses.smoothing, 'rot', 0.1, 0.9, 0.05).name('Rotation Smoothing')
  smoothingFolder.add(settings_glasses.smoothing, 'scale', 0.1, 0.9, 0.05).name('Scale Smoothing')
  
  let manualFolder = gui.addFolder('Manual Override')
  manualFolder.add(settings_glasses, 'manualRotationY', -Math.PI, Math.PI, 0.1).name('Manual Y Rotation')
  
  // Performance optimization settings
  let performanceFolder = gui.addFolder('Performance Optimization')
  performanceFolder.add(settings_glasses, 'detectionFrameSkip', 1, 5, 1).name('Detection Frame Skip')
  performanceFolder.add(settings_glasses, 'detectionResolutionScale', 0.25, 1.0, 0.05).name('Detection Resolution Scale')
  performanceFolder.add(settings_glasses, 'adaptiveDetection').name('Adaptive Detection')
  performanceFolder.add(settings_glasses, 'headMovementThreshold', 0.001, 0.1, 0.001).name('Head Movement Threshold')
  
  // Memory optimization settings
  let memoryFolder = gui.addFolder('Memory Optimization')
  memoryFolder.add(settings_glasses, 'enableObjectPooling').name('Enable Object Pooling')
  memoryFolder.add(settings_glasses, 'memoryCleanupInterval', 10000, 60000, 5000).name('Memory Cleanup Interval (ms)')
  memoryFolder.add(settings_glasses, 'maxModelCacheSize', 5, 20, 1).name('Max Model Cache Size')
  
  // Camera optimization settings
  let cameraFolder = gui.addFolder('Camera Optimization')
  cameraFolder.add(settings_glasses, 'enableCameraOptimization').name('Enable Camera Optimization')
  cameraFolder.add(settings_glasses, 'cameraResolutionScale', 0.25, 1.0, 0.05).name('Camera Resolution Scale')
  cameraFolder.add(settings_glasses, 'cameraFrameRate', 15, 60, 5).name('Camera Frame Rate')
  
  // Mobile optimization settings
  let mobileFolder = gui.addFolder('Mobile Optimization')
  mobileFolder.add(settings_glasses, 'enableMobileOptimizations').name('Enable Mobile Optimizations')
  mobileFolder.add(settings_glasses, 'mobileOptimizationLevel', ['auto', 'low', 'high', 'desktop']).name('Mobile Optimization Level')
  mobileFolder.add(settings_glasses, 'mobileFrameRate', 15, 30, 5).name('Mobile Frame Rate')
  mobileFolder.add(settings_glasses, 'mobileResolutionScale', 0.25, 1.0, 0.05).name('Mobile Resolution Scale')
  mobileFolder.add(settings_glasses, 'lowEndMobileMode').name('Force Low-End Mobile Mode')
  
  sunglassesFolder.open()
  smoothingFolder.open()
  manualFolder.open()
  performanceFolder.open()
}

export { 
  settings,
  settings_glasses
}