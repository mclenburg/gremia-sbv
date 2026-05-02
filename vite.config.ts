import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Wichtig für Electron/AppImage:
// Im Paket wird die Oberfläche über file://.../dist/index.html geladen.
// Vite darf dann keine absoluten /assets/... Pfade erzeugen, sonst bleibt
// das Fenster im AppImage weiß, weil file:///assets/... nicht existiert.
//
// TypeScript kennt die Alias-Pfade aus tsconfig.json bereits. Vite/Rollup
// braucht dieselben Aliase zusätzlich hier, sonst scheitert der Production-Build
// bei Imports wie @services/textCommandPolicy.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@services': fileURLToPath(new URL('./services', import.meta.url)),
      '@database': fileURLToPath(new URL('./database', import.meta.url))
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
