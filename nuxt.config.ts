// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  
  // Pinia state management
  modules: ['@pinia/nuxt'],
  
  // SEO Configuration
  app: {
    head: {
      title: 'Virtual Try-On Glasses - AI-Powered Eyewear Shopping',
      titleTemplate: '%s | Virtual Try-On Glasses',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: 'Revolutionary AI-powered virtual try-on technology for glasses. Let customers try on eyewear instantly using their camera. Perfect for online eyewear stores and e-commerce.' 
        },
        { name: 'keywords', content: 'virtual try on glasses, AI eyewear, online glasses shopping, virtual fitting, AR glasses, eyewear technology, glasses try on app' },
        { name: 'author', content: 'Virtual Try-On Glasses' },
        { name: 'robots', content: 'index, follow' },
        { name: 'googlebot', content: 'index, follow' },
        { name: 'language', content: 'en' },
        { name: 'revisit-after', content: '7 days' },
        
        // Open Graph Meta Tags
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Virtual Try-On Glasses - AI-Powered Eyewear Shopping' },
        { property: 'og:description', content: 'Revolutionary AI-powered virtual try-on technology for glasses. Let customers try on eyewear instantly using their camera.' },
        { property: 'og:image', content: '/og-image.jpg' },
        { property: 'og:url', content: 'https://www.makemetryon.com' },
        { property: 'og:site_name', content: 'Virtual Try-On Glasses' },
        { property: 'og:locale', content: 'en_US' },
        
        // Twitter Card Meta Tags
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Virtual Try-On Glasses - AI-Powered Eyewear Shopping' },
        { name: 'twitter:description', content: 'Revolutionary AI-powered virtual try-on technology for glasses. Let customers try on eyewear instantly using their camera.' },
        { name: 'twitter:image', content: '/twitter-image.jpg' },
        { name: 'twitter:site', content: '@VirtualTryOn' },
        { name: 'twitter:creator', content: '@VirtualTryOn' },
        
        // Additional SEO Meta Tags
        { name: 'theme-color', content: '#2563eb' },
        { name: 'msapplication-TileColor', content: '#2563eb' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Virtual Try-On Glasses' },
        

      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://www.googletagmanager.com' },
        { rel: 'dns-prefetch', href: 'https://www.google-analytics.com' },
        { rel: 'canonical', href: 'https://www.makemetryon.com' }
      ],
      script: [
        // Google Tag Manager
        {
          innerHTML: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${process.env.GOOGLE_TAG_MANAGER_ID || 'GTM-P5F97NMJ'}');`
        },
        // Google Analytics (gtag.js)
        {
          src: `https://www.googletagmanager.com/gtag/js?id=${process.env.GOOGLE_ANALYTICS_ID || 'G-Q69N7FSGZ1'}`,
          async: true
        },
        {
          innerHTML: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.GOOGLE_ANALYTICS_ID || 'G-Q69N7FSGZ1'}');
          `
        },
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Virtual Try-On Glasses",
            "description": "AI-powered virtual try-on technology for eyewear shopping",
            "url": "https://www.makemetryon.com",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "Virtual Try-On Glasses"
            },
            "featureList": [
              "Real-time face tracking",
              "AI-powered glasses fitting",
              "Camera-based try-on",
              "Shopify integration ready"
            ]
          })
        },
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Virtual Try-On Glasses",
            "description": "Revolutionary AI-powered virtual try-on technology for eyewear shopping",
            "url": "https://www.makemetryon.com",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://www.makemetryon.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Virtual Try-On Glasses",
              "url": "https://www.makemetryon.com"
            }
          })
        },
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Virtual Try-On Glasses",
            "url": "https://www.makemetryon.com",
            "logo": "https://www.makemetryon.com/logo.png",
            "description": "Leading provider of AI-powered virtual try-on technology for eyewear e-commerce",
            "foundingDate": "2025",
            "sameAs": [
              "https://twitter.com/VirtualTryOn",
              "https://linkedin.com/company/virtual-try-on-glasses"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "availableLanguage": "English"
            }
          })
        }
      ]
    }
  },
  
  // Performance optimizations
  nitro: {
    compressPublicAssets: true,
    minify: true,
    // Enable gzip compression
    experimental: {
      wasm: true
    }
  },
  
  // Build optimizations
  build: {
    analyze: false
  },
  
  // Image optimization (requires @nuxt/image module)
  // image: {
  //   quality: 80,
  //   format: ['webp', 'avif', 'jpeg'],
  //   screens: {
  //     xs: 320,
  //     sm: 640,
  //     md: 768,
  //     lg: 1024,
  //     xl: 1280,
  //     xxl: 1536
  //   }
  // },
  
  // CSS optimization
  // css: ['~/app/style/style.scss'],
  
  // Runtime config for environment variables
  runtimeConfig: {
    public: {
      siteUrl: 'https://makemetryon.com',
      siteName: 'Virtual Try-On Glasses',
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || 'G-Q69N7FSGZ1',
      googleTagManagerId: process.env.GOOGLE_TAG_MANAGER_ID || 'GTM-P5F97NMJ',
      // apiUrl: process.env.API_URL || 'http://localhost:5000/api'
      apiUrl: process.env.API_URL || 'https://api.makemetryon.com/api'
    }
  },
  
  // Google Analytics and Search Console integration
  // Note: Add your Google Analytics ID to environment variables
})
