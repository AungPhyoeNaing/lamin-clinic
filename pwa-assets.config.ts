import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  images: ['public/logo-glass.webp'],
  preset: {
    ...minimalPreset,
    maskable: { ...minimalPreset.maskable, resizeOptions: { background: '#123F38' } },
    apple: { ...minimalPreset.apple, resizeOptions: { background: '#123F38' } },
  },
})
