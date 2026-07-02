import { defineConfig } from 'vite'

import path from 'path'

import { writeFileSync, mkdirSync } from 'node:fs'

import tailwindcss from '@tailwindcss/vite'

import react from '@vitejs/plugin-react'

import { readChangelogVersion } from './scripts/read-changelog-version.mjs'
import { renderVersionJson, readGitCommitShort } from './scripts/build-version-json.mjs'
import { renderServiceWorker, writeServiceWorker } from './scripts/generate-service-worker.mjs'



function serviceWorkerPlugin() {
  // Build Identity — cache SW rotuje per commit (nie per Release Version).
  let buildId = 'unknown'
  return {
    name: 'wgdom-service-worker',
    buildStart() {
      buildId = readGitCommitShort()
    },
    configureServer(server: {
      middlewares: {
        use: (
          fn: (
            req: { url?: string },
            res: { setHeader: (k: string, v: string) => void; end: (b: string) => void },
            next: () => void,
          ) => void,
        ) => void
      }
    }) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url === '/sw.js') {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(renderServiceWorker(readGitCommitShort()))
          return
        }
        next()
      })
    },
    closeBundle() {
      const outPath = path.resolve(__dirname, 'dist/sw.js')
      mkdirSync(path.dirname(outPath), { recursive: true })
      writeServiceWorker(buildId, outPath)
    },
  }
}



function versionJsonPlugin() {

  let version = '0.0.0'

  return {

    name: 'wgdom-version-json',

    buildStart() {

      version = readChangelogVersion()

    },

    configureServer(server: {

      middlewares: {

        use: (

          fn: (

            req: { url?: string },

            res: { setHeader: (k: string, v: string) => void; end: (b: string) => void },

            next: () => void,

          ) => void,

        ) => void

      }

    }) {

      server.middlewares.use((req, res, next) => {

        const url = req.url?.split('?')[0]

        if (url === '/version.json') {

          res.setHeader('Content-Type', 'application/json')

          res.setHeader('Cache-Control', 'no-store')

          res.end(renderVersionJson())

          return

        }

        next()

      })

    },

    closeBundle() {
      const outPath = path.resolve(__dirname, 'dist/version.json')
      mkdirSync(path.dirname(outPath), { recursive: true })
      writeFileSync(outPath, renderVersionJson())
    },

  }

}



export default defineConfig(() => {

  const appVersion = readChangelogVersion()
  const appCommit = readGitCommitShort()

  return {

    plugins: [

      react(),

      tailwindcss(),

      versionJsonPlugin(),
      serviceWorkerPlugin(),

    ],

    define: {

      __APP_VERSION__: JSON.stringify(appVersion),

      __APP_COMMIT__: JSON.stringify(appCommit),

    },

    resolve: {

      alias: {

        '@': path.resolve(__dirname, './src'),

      },

    },

    assetsInclude: ['**/*.svg', '**/*.csv'],

    build: {

      // Performance 2.2A MIN — nie preloaduj lazy paneli przy starcie (Pulpit)

      modulePreload: {

        polyfill: true,

        resolveDependencies(_filename, deps) {

          const deferLazyPanels = /panel-(jobs|payroll|tenders|inspector-admin|inspector|guide)\b/;

          return deps.filter((dep) => !deferLazyPanels.test(dep));

        },

      },

      rollupOptions: {

        output: {

          manualChunks(id) {

            if (id.includes('/src/config/supabase.ts') || id.includes('/src/lib/cloud-sync.ts')) {

              return 'app-core';

            }

            if (id.includes('node_modules')) {

              if (id.includes('pdfmake') || id.includes('pdfkit') || id.includes('fontkit')) {

                return 'pdfmake';

              }

              if (id.includes('pdfjs') || id.includes('pdf.worker')) {

                return 'pdfjs';

              }

              if (id.includes('@radix-ui')) {

                return 'ui-vendor';

              }

              return;

            }

            // GuideView + changelog-data — NIE wymuszaj panel-guide (20.6A.5):
            // wymuszenie powodowało react-jsx-runtime w panel-guide → static import z entry → startup preload.

            // Performance 2.2C — panel-* manualChunks usunięte (eksperyment SCC)

          },

        },

      },

    },

    server: {

      host: '127.0.0.1',

      port: 5173,

      strictPort: true,

      open: false,

    },

    preview: {

      host: '127.0.0.1',

      port: 4173,

      strictPort: true,

    },

  }

})


