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
            id.includes('/src/app/TendersView.tsx')
            || id.includes('/src/app/TenderDetailPanel.tsx')
            || id.includes('/src/app/TenderBidPrepPanel.tsx')
            || id.includes('/src/app/TendersMapPanel.tsx')
          ) {
            return 'panel-tenders';
          }
          if (
            id.includes('/src/app/InspectorPanel')
            || id.includes('/src/app/InspectorDashboard')
            || id.includes('/src/app/InspectorNavigation')
          ) {
            return 'panel-inspector';
          }
          if (id.includes('/src/app/InspectorAdminView')) {
            return 'panel-inspector-admin';
          }
          if (
            id.includes('/src/app/GuideView')
            || id.includes('/src/app/changelog-data')
          ) {
            return 'panel-guide';
          }
          if (
            id.includes('/src/app/JobsView')
            || id.includes('/src/app/PayrollView')
          ) {
            return id.includes('PayrollView') ? 'panel-payroll' : 'panel-jobs';
          }
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
