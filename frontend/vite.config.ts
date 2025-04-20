import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
<<<<<<< HEAD
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
=======
  }
>>>>>>> ee0f8b66d95e45595ff8fe3312d03d1d1c7c8959
})
