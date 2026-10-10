import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The deck reuses DataScape's real assets (sprites, atlas, data.json) from ../dist.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5174, fs: { allow: ['..'] } },
  // The OpenStreetMap snapshots are large JSON chunks loaded lazily.
  build: { chunkSizeWarningLimit: 900 },
});
