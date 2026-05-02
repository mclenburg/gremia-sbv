import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Wichtig für Electron/AppImage:
// Im Paket wird die Oberfläche über file://.../dist/index.html geladen.
// Vite darf dann keine absoluten /assets/... Pfade erzeugen, sonst bleibt
// das Fenster im AppImage weiß, weil file:///assets/... nicht existiert.
export default defineConfig({
  base: './',
  plugins: [react()],
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
