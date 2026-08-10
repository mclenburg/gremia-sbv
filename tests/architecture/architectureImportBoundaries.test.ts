import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

type ImportEdge = {
  file: string;
  specifier: string;
  resolved?: string;
};

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [absolute.replaceAll('\\', '/')] : [];
  });
}

function collectImports(file: string): ImportEdge[] {
  const source = readFileSync(file, 'utf8');
  const edges: ImportEdge[] = [];
  const importPattern = /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    let resolvedPath: string | undefined;
    if (specifier.startsWith('.')) {
      resolvedPath = normalize(join(dirname(file), specifier)).replaceAll('\\', '/');
    }
    edges.push({ file, specifier, resolved: resolvedPath });
  }
  return edges;
}

function allImports(): ImportEdge[] {
  return [
    ...collectFiles('src/app'),
    ...collectFiles('electron'),
    ...collectFiles('services'),
  ].flatMap(collectImports);
}

function isServiceImportFromRenderer(edge: ImportEdge): boolean {
  if (!edge.file.startsWith('src/app/')) return false;
  if (edge.specifier.startsWith('node:') || edge.specifier === 'electron' || edge.specifier.startsWith('electron/')) return true;
  if (!edge.resolved) return false;
  const absolute = resolve(edge.resolved);
  return relative(resolve('services'), absolute).split(/[\\/]/)[0] !== '..';
}

function isFeatureImportingElectronBoundary(edge: ImportEdge): boolean {
  return edge.file.startsWith('src/app/features/')
    && (edge.specifier === 'electron' || edge.specifier.startsWith('node:') || edge.specifier.startsWith('electron/'));
}

function isServiceImportingRendererUi(edge: ImportEdge): boolean {
  if (!edge.file.startsWith('services/') || !edge.resolved) return false;
  const normalized = edge.resolved.replaceAll('\\', '/');
  return normalized.includes('/src/app/features/')
    || normalized.includes('/src/app/shared/components/')
    || normalized.includes('/src/app/shared/a11y/');
}

describe('Architektur-Importgrenzen 0.9.1', () => {
  it('hält Renderer und Feature-Module frei von direktem Node-, Electron- und Servicezugriff', () => {
    const violations = allImports()
      .filter((edge) => isServiceImportFromRenderer(edge) || isFeatureImportingElectronBoundary(edge))
      .map((edge) => `${edge.file} -> ${edge.specifier}`)
      .sort();

    expect(violations).toEqual([]);
  });

  it('verhindert Rückimporte aus Services in Renderer-UI und Feature-Komponenten', () => {
    const violations = allImports()
      .filter(isServiceImportingRendererUi)
      .map((edge) => `${edge.file} -> ${edge.specifier}`)
      .sort();

    expect(violations).toEqual([]);
  });

  it('hält Template-Defaults außerhalb des Cases-Feature-Moduls', () => {
    const violations = allImports()
      .filter((edge) => edge.file.startsWith('src/app/features/settings/') || edge.file.startsWith('src/app/features/templates/'))
      .filter((edge) => edge.specifier.includes('/cases/') || edge.specifier.includes('casesViewProcessUtils'))
      .map((edge) => `${edge.file} -> ${edge.specifier}`)
      .sort();

    expect(violations).toEqual([]);
  });

});
