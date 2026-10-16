import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project below /AuditIA/.
  // Set BASE_PATH=/ for a root-domain deployment instead.
  base: process.env.BASE_PATH || '/AuditIA/',
  build: {
    outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
    sourcemap: process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
    rollupOptions: {
      maxParallelFileOps: 128,
    },
  },
});
