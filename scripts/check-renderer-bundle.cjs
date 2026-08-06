#!/usr/bin/env node
const { existsSync, readFileSync, readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const root = process.cwd();
const dist = join(root, 'dist');
const manifestPath = join(dist, '.vite', 'manifest.json');
const contractPath = join(root, 'maintenance', 'bundle', 'renderer-bundle-contract.json');

function fail(message) {
  console.error(`Renderer-Bundle-Gate fehlgeschlagen: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(manifestPath)) fail('Vite-Manifest fehlt. Zuerst build:compile ausführen.');
else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const entries = Object.entries(manifest);
  const main = entries.find(([, value]) => value.isEntry);
  if (!main) fail('Kein Renderer-Einstieg im Vite-Manifest gefunden.');
  else {
    const mainFile = join(dist, main[1].file);
    const mainBytes = statSync(mainFile).size;
    const dynamic = entries.filter(([, value]) => value.isDynamicEntry);
    const files = readdirSync(join(dist, 'assets')).filter((name) => name.endsWith('.js'));
    const totalJsBytes = files.reduce((sum, name) => sum + statSync(join(dist, 'assets', name)).size, 0);
    const lazySources = new Set(dynamic.flatMap(([, value]) => [value.src, ...(value.dynamicImports ?? [])]).filter(Boolean));
    const missingLazyFeatures = contract.requiredLazyFeatureSources.filter((source) => !lazySources.has(source));
    if (mainBytes > contract.maximumMainChunkBytes) fail(`Hauptchunk ${mainBytes} Bytes > ${contract.maximumMainChunkBytes} Bytes.`);
    if (dynamic.length < contract.minimumDynamicChunks) fail(`Nur ${dynamic.length} dynamische Chunks; erwartet mindestens ${contract.minimumDynamicChunks}.`);
    if (totalJsBytes > 0 && mainBytes / totalJsBytes > contract.maximumMainShareOfJavascript) {
      fail(`Hauptchunk-Anteil ${(mainBytes / totalJsBytes * 100).toFixed(1)} % > ${(contract.maximumMainShareOfJavascript * 100).toFixed(1)} %.`);
    }
    if (missingLazyFeatures.length) fail(`Lazy-Feature-Quellen fehlen: ${missingLazyFeatures.join(', ')}`);
    if (!process.exitCode) {
      console.log(`Renderer-Bundle OK: main=${mainBytes} Bytes, dynamic=${dynamic.length}, JS gesamt=${totalJsBytes} Bytes.`);
    }
  }
}
