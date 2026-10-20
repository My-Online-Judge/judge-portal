import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import type { Rollup } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const isAdmin = (id: string) => id.includes('/src/pages/admin/') || id.includes('/src/components/admin/')
// Monaco, plus our code that loads it: if an admin page ever imports the editor, these must not fall into "shared",
// which the entry imports.
const isMonaco = (id: string) =>
  id.includes('node_modules/monaco-editor') ||
  id.includes('/src/lib/monaco') ||
  id.includes('/src/components/common/CodeEditor.vue')

/** Walks up the static importers of `id` and reports whether any module on the way satisfies `found`. */
function importedFrom(id: string, getModuleInfo: Rollup.GetModuleInfo, found: (m: Rollup.ModuleInfo) => boolean, skip = (_id: string) => false) {
  const seen = new Set([id])
  const todo = [id]
  while (todo.length) {
    const info = getModuleInfo(todo.pop()!)
    if (!info) continue
    if (found(info)) return true
    for (const importer of info.importers) {
      if (!seen.has(importer) && !skip(importer)) {
        seen.add(importer)
        todo.push(importer)
      }
    }
  }
  return false
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // scripts/check-initial-js.mjs reads the manifest to hold /problems to its initial-JS budget.
    manifest: true,
    rollupOptions: {
      output: {
        // Admin pages share one chunk, and Monaco gets its own; neither loads on the client pages until needed.
        manualChunks(id, { getModuleInfo }) {
          if (isAdmin(id)) return 'admin'
          if (isMonaco(id)) return 'monaco'
          // Rollup moves every static dependency of a manual chunk into that chunk unless it sits in another manual
          // chunk. Without this rule vue, reka-ui and the shared components land in "admin" (and Vite's preload helper
          // could land in "monaco"), and the entry imports that chunk. So code that admin or Monaco shares with the
          // client (the entry, or a page the client imports lazily) is named "shared" instead.
          const fromManualChunk = importedFrom(id, getModuleInfo, (m) => isAdmin(m.id) || isMonaco(m.id))
          const fromClient = importedFrom(
            id,
            getModuleInfo,
            (m) => m.isEntry || m.dynamicImporters.some((d) => !isAdmin(d) && !isMonaco(d)),
            (importer) => isAdmin(importer) || isMonaco(importer),
          )
          if (fromManualChunk && fromClient) return 'shared'
        },
      },
    },
  },
  // Dev server only (not part of the production build): forward /api to the HTTPS edge.
  // secure: false because the edge's certificate is issued by the private OJ CA.
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
  },
})
