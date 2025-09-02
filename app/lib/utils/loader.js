import * as THREE from 'three/webgpu'
import { TextureLoader } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'

import { init } from '@/lib/core.js'

// NOTE: Core
let model
let hdr 
let modelLoaded = false

function loader (canvas_id) {
  // NOTE: Init Loading Manager
  // This like JS Promises
  // We use Loading Manager to be able to display the load percentage
  const loading_manager =  new THREE.LoadingManager()

  const texture_loader = new TextureLoader(loading_manager)

  // NOTE: Init RGBELoader for image with extension .hdr
  const rgb_loader = new RGBELoader(loading_manager)
  rgb_loader.load(new URL('@/assets/brown_photostudio_02_1k.hdr', import.meta.url).href, (hdr_loaded) => {
    hdr = hdr_loaded
  })

  const draco_loader = new DRACOLoader()

  // Set the decoder path
  draco_loader.setDecoderPath(new URL('@/lib/draco', import.meta.url).href)
  draco_loader.setDecoderConfig({ type: 'js' })
  
  // NOTE: Init GLTF Loader & set decoder
  const loader = new GLTFLoader(loading_manager)
  loader.setDRACOLoader(draco_loader)

  // Load sunglasses model
  loader.load(new URL('@/assets/scene_glasses.glb', import.meta.url).href, (gltfScene) => {
    model = gltfScene.scene
  })

  // NOTE: Start canvas settings
  loading_manager.onLoad = function () {
    // Only initialize if model is loaded or if there was an error
    init(canvas_id)
  }
}

export { loader, hdr, model }