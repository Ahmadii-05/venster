import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Two modes:
//  - default: normal browser dev / standalone build (dev server on :3000)
//  - webview: production build packaged into the VS Code extension
//             (relative asset paths so webview URIs resolve; output goes to
//              vscode-extension/webview/dist)
export default defineConfig(({ mode }) => {
  const isWebview = mode === 'webview'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
    },
    // Relative base so the built index.html references ./assets/... which the
    // extension rewrites into webview-resource URIs.
    base: isWebview ? './' : '/',
    build: isWebview
      ? {
          outDir: '../vscode-extension/webview/dist',
          emptyOutDir: true,
          // Source maps so runtime errors inside the webview trace back to
          // the original TS/React source. Not packaged into the VSIX.
          sourcemap: true,
        }
      : {},
  }
})
