import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, URL } from 'node:url';

// Wichtig für Electron/AppImage:
// Im Paket wird die Oberfläche über file://.../dist/index.html geladen.
// Vite darf dann keine absoluten /assets/... Pfade erzeugen, sonst bleibt
// das Fenster im AppImage weiß, weil file:///assets/... nicht existiert.
//
// TypeScript kennt die Alias-Pfade aus tsconfig.json bereits. Vite/Rollup
// braucht dieselben Aliase zusätzlich hier.
function developmentCspNoncePlugin(nonce: string) {
  const strictStyleDirective = "style-src 'self';";
  return {
    name: 'gremia-development-csp-nonce',
    enforce: 'pre' as const,
    transformIndexHtml(html: string) {
      if (!html.includes(strictStyleDirective)) {
        throw new Error('Development-CSP konnte die strikte style-src-Direktive nicht finden.');
      }
      return html.replace(
        strictStyleDirective,
        `style-src 'self' 'nonce-${nonce}';`,
      );
    },
  };
}

export default defineConfig(({ command }) => {
  // Vite injiziert CSS im Dev-/E2E-Server als <style>-Elemente. Ein zufälliger
  // Nonce hält die statische Produktions-CSP strikt, ohne im Browser-E2E CSS zu blockieren.
  const developmentNonce = command === 'serve' ? randomBytes(18).toString('base64') : null;

  return {
    base: './',
    html: developmentNonce ? { cspNonce: developmentNonce } : undefined,
    plugins: [react(), ...(developmentNonce ? [developmentCspNoncePlugin(developmentNonce)] : [])],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
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
      emptyOutDir: true,
      manifest: true,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor',
                test: /node_modules/,
                priority: 10
              }
            ]
          }
        }
      }
    }
  };
});
