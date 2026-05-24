import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages publishes the site at https://<user>.github.io/<repo>/, so the
// asset base must match the repository name (case-sensitive). Override with VITE_BASE for forks.
const repoBase = process.env.VITE_BASE ?? '/Sunny3D_Experiment/';

export default defineConfig({
  base: repoBase,
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
