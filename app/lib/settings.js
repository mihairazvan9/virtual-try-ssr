import GUI from 'lil-gui'


// ---------- config ----------
const SMOOTHING = { 
  pos: 0.8, 
  rot: 0.8, 
  scale: 0.35, 
}; // [0..1], higher = snappier

// Settings
let settings_glasses = {
  show: false,
  mobileMultiplier: 1,
  baseScaleMultiplier: 1,
  manualRotationY: 3.14,
  // Local offsets of the glasses relative to the head anchor
  offsetX: 0,
  offsetY: 0,
  offsetZ: 46,
  depthOffset: 86,
  // IPD-based scaling settings
  frameToIpdRatio: 1.6,
  // Smoothing settings
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
  
  let smoothingFolder = gui.addFolder('Smoothing')
  smoothingFolder.add(settings_glasses.smoothing, 'pos', 0.1, 0.9, 0.05).name('Position Smoothing')
  smoothingFolder.add(settings_glasses.smoothing, 'rot', 0.1, 0.9, 0.05).name('Rotation Smoothing')
  smoothingFolder.add(settings_glasses.smoothing, 'scale', 0.1, 0.9, 0.05).name('Scale Smoothing')
  
  let manualFolder = gui.addFolder('Manual Override')
  manualFolder.add(settings_glasses, 'manualRotationY', -Math.PI, Math.PI, 0.1).name('Manual Y Rotation')
  
  sunglassesFolder.open()
  smoothingFolder.open()
  manualFolder.open()
}

export { 
  settings,
  settings_glasses
}