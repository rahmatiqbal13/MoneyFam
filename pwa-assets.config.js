import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Regenerate the app icons from public/icon.svg:
//   npx pwa-assets-generator
// Maskable and Apple icons are padded onto the paper background; maskable
// keeps the envelope inside Android's circular safe zone.
const paper = { background: '#F2EDE3' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, padding: 0.22, resizeOptions: paper },
    apple: { ...preset.apple, padding: 0.1, resizeOptions: paper },
  },
  images: ['public/icon.svg'],
})
