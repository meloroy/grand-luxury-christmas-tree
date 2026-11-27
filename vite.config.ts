import { copyFileSync, cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function mediapipeWasm(): Plugin {
  const copy = () => {
    const source = resolve('node_modules/@mediapipe/tasks-vision/wasm')
    const destination = resolve('public/mediapipe/wasm')
    if (existsSync(source)) cpSync(source, destination, { recursive: true })
  }
  return {
    name: 'mediapipe-wasm',
    buildStart: copy,
    configureServer: copy,
  }
}

function spaFallback(): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    closeBundle() {
      const index = resolve('dist/index.html')
      if (existsSync(index)) copyFileSync(index, resolve('dist/404.html'))
    },
  }
}

export default defineConfig({
  base: '/grand-luxury-christmas-tree/',
  plugins: [react(), tailwindcss(), mediapipeWasm(), spaFallback()],
  server: { host: '0.0.0.0', port: 5173, watch: { ignored: ['**/.taste-skill/**'] } },
  preview: { host: '0.0.0.0', port: 4173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
})
