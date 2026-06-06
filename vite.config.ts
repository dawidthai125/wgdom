import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
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
        const deferLazyPanels = /panel-(jobs|payroll|tenders|inspector-admin|inspector)\b/;
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
          if (
            id.includes('/src/app/InspectorNavigation')
            || id.includes('/src/app/InspectorJobFileUpload')
            || id.includes('/src/app/InspectorPhotoGallery')
            || id.includes('/src/app/InspectorAdminJobDetail')
            || id.includes('/src/app/WmPortfolioView')
          ) {
            return 'shared-inspector';
          }
          if (
            id.includes('/src/app/GuideView')
            || id.includes('/src/app/changelog-data')
          ) {
            return 'panel-guide';
          }
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
})
