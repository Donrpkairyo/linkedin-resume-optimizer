import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ['prop-types'],
    exclude: ['@mantine/core', '@mantine/hooks', '@mantine/notifications'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@mantine/core', '@mantine/hooks', '@mantine/notifications'],
        },
      },
    },
  },
})
