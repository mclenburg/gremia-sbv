import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist-electron/electron',
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: resolve(projectRoot, 'electron/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rolldownOptions: {
      external: ['electron'],
    },
  },
});
