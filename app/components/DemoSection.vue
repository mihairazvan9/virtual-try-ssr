<script setup>
  import { ref, onMounted } from 'vue'
  // Hero section component logic
  import { loader } from '@/lib/utils/loader.js'
  import { START_RAF, STOP_RAF, } from '@/lib/core.js'
  import glassesImg from '@/assets/glasses.png'


  const show_canvas = ref(null)

  function start_try_on () {
    // Only run loader in browser environment
    if (typeof window !== 'undefined' && show_canvas.value === null) {
      loader('preview-3D')
      show_canvas.value = true
      console.log('null')

    }

    else if (show_canvas.value === true) {
      show_canvas.value = false
      console.log('true')
      STOP_RAF()
    } else if (show_canvas.value === false) {
      show_canvas.value = true
      console.log('false')
      START_RAF()
      loader('preview-3D')
    }
  }



</script>

<template>
  <section id="demo-section" class="demo-section">
      <h2 class="demo-section-title">
        Live Virtual Try-On Demo
      </h2>
      <p class="demo-section-description">
        Experience our AI-powered virtual try-on technology directly in your browser. 
        Enable your camera to see how our advanced face tracking and AR technology 
        creates a realistic glasses fitting experience in real time.
      </p>
    <div class="demo-wrapper">
      <div id="demo" class="hero-visual">
        <div class="demo-container">
          <div class="demo-header">
            <div class="demo-controls">
              <div class="control-dot control-red"></div>
              <div class="control-dot control-yellow"></div>
              <div class="control-dot control-green"></div>
            </div>
            <div class="demo-title">Preview • Try-on session</div>
            <div class="demo-status">Live</div>
          </div>

          <div class="demo-content">
            <!-- INSERT_YOUR_CODE -->
            <img
              v-if="!show_canvas"
              :src="glassesImg"
              alt="AI-powered virtual try-on glasses technology demonstration - Click to start camera-based fitting"
              class="demo-default-img"
              loading="lazy"
            />
            <div v-if="show_canvas" class="demo-preview">
              <div class="loading-container">
                <img src="@/assets/loading.gif" alt="Loading virtual try-on technology" class="loading-gif">
              </div>
              <div class="preview-layout">
                <div class="preview-face">
                  <canvas id="preview-3D"></canvas>
                </div>
                <SelectGlasses />

              </div>
            </div>
          </div>

          <div class="demo-actions">
            <button class="btn"
            :class="!show_canvas ? 'try-on-btn' : 'try-off-btn'"
            @click="start_try_on"
            type="button"
            :aria-label="!show_canvas ? 'Start virtual try-on demo with camera' : 'Stop virtual try-on demo'"
            >
              {{ !show_canvas ? 'Start Virtual Try-On' : 'Stop Virtual Try-On' }}
            </button>
          </div>
        </div>

        <!-- <div class="demo-tip">
          Tip: For best results allow camera access and position your face inside the guide.
        </div> -->
      </div>
    </div>
  </section>
</template>


<style lang="scss" scoped>
/* Demo Section Styles */
.demo-section {
  background-color: #f3f4f6;
  padding-top: 5rem;
  padding-bottom: 5rem;
  text-align: center;
}

.demo-section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

.demo-section-description {
  font-size: 1.125rem;
  color: #6b7280;
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.demo-wrapper {
  display: flex;
  justify-content: center;
}

/* Canvas styles */
.hero-visual {
  width: calc(400px + 2rem);

  @media (min-width: 1024px) {
  }


  .demo-container {
    border-radius: 1rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    border: 1px solid hsl(214.3 31.8% 91.4%);
    overflow: hidden;
    background: white;

    .demo-actions {
      background: #F8FAFC;
      padding: 8px 1rem;

      .btn {
        width: 100%;
      }
    }
  }

  .demo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
  }

  .demo-controls {
    display: flex;
    gap: 0.5rem;
  }

  .control-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    
    &.control-red { background: #f87171; }
    &.control-yellow { background: #fbbf24; }
    &.control-green { background: #34d399; }
  }

  .demo-title, .demo-status {
    font-size: 0.75rem;
    margin: 0;
    color: #64748b;
  }

  .demo-content {
    padding: 1rem;
    background: linear-gradient(to bottom, rgba(15, 23, 42, 0.05), white);
  }

  .demo-preview {
    position: relative;
    border-radius: 1rem;
    overflow: hidden;
    background: rgba(15, 23, 42, 0.05);
    height: 598px;

    .loading-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #0F172A;

      .loading-gif {
        display: block;
        margin: 0 auto;
      }
    }
  }

  .demo-default-img {
    border-radius: 1rem;
    max-width: 100%; 
    display: block; 
    margin: 0 auto;

  }

  .preview-layout {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 1.5rem;
    
    @media (min-width: 1024px) {
      flex-direction: row;
    }
  }

  .preview-face, .preview-frames {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    
    @media (min-width: 1024px) {
      width: 50%;
    }
  }
}

</style>
