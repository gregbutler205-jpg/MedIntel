import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// S-03 / PG-05: the CSP meta tag in index.html / companion/index.html is the
// production policy (GitHub Pages cannot set response headers). It is stripped
// during `npm run dev` ONLY, because @vitejs/plugin-react injects an inline
// react-refresh preamble in dev that `script-src 'self'` would block.
// Production builds ship the tag untouched.
const stripCspInDev = {
  name: 'strip-csp-in-dev',
  apply: 'serve',
  transformIndexHtml(html) {
    return html.replace(/[ \t]*<meta http-equiv="Content-Security-Policy"[^>]*>\r?\n/, '')
  },
}

export default defineConfig({
  plugins: [react(), stripCspInDev],
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
