import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      input: {
        // Two HTML entry points sharing one JS bundle. The companion gets its own
        // path (/companion/) so iOS installs it as a distinct app from the full
        // web app (which sits at /). Both load src/main.jsx, which routes by URL.
        main:      fileURLToPath(new URL('./index.html', import.meta.url)),
        companion: fileURLToPath(new URL('./companion/index.html', import.meta.url)),
      },
    },
  },
})
