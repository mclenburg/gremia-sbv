import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

type ImportEdge = {
  file: string;
  specifier: string;
  resolved?: string;
};

const SOURCE_ALIASES: ReadonlyArray<readonly [prefix: string, root: string]> = [
  ['@services/', 'services'],
  ['@database/', 'database'],
  ['@/', 'src'],
];

function resolveProjectImport(file: string, specifier: string): string | undefined {
  if (specifier.startsWith('.')) {
    return normalize(join(dirname(file), specifier)).replaceAll('\\', '/');
  }
  const alias = SOURCE_ALIASES.find(([prefix]) => specifier.startsWith(prefix));
  if (!alias) return undefined;
  return normalize(join(alias[1], specifier.slice(alias[0].length))).replaceAll('\\', '/');
}

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
    const resolvedPath = resolveProjectImport(file, specifier);
    edges.push({ file, specifier, resolved: resolvedPath });
  }
  return edges;
}

function allImports(): ImportEdge[] {
  return [
    ...collectFiles('src/app'),
    ...collectFiles('src/domain'),
    ...collectFiles('electron'),
    ...collectFiles('services'),
  ].flatMap(collectImports);
}

function isServiceImportFromRenderer(edge: ImportEdge): boolean {
  if (!edge.file.startsWith('src/app/')) return false;
  if (edge.specifier.startsWith('node:') || edge.specifier === 'electron' || edge.specifier.startsWith('electron/')) return true;
  if (!edge.resolved) return false;
  const absolute = resolve(edge.resolved);
  return [resolve('services'), resolve('database')].some(
    (root) => relative(root, absolute).split(/[\\/]/)[0] !== '..',
  );
}

function isFeatureImportingElectronBoundary(edge: ImportEdge): boolean {
  return edge.file.startsWith('src/app/features/')
    && (edge.specifier === 'electron' || edge.specifier.startsWith('node:') || edge.specifier.startsWith('electron/'));
}

function isBackendImportingRenderer(edge: ImportEdge): boolean {
  if ((!edge.file.startsWith('services/') && !edge.file.startsWith('electron/')) || !edge.resolved) return false;
  const absolute = resolve(edge.resolved);
  return relative(resolve('src/app'), absolute).split(/[\\/]/)[0] !== '..';
}

function isDomainImportingPlatformOrRenderer(edge: ImportEdge): boolean {
  if (!edge.file.startsWith('src/domain/')) return false;
  if (edge.specifier.startsWith('node:') || edge.specifier === 'electron' || edge.specifier.startsWith('electron/')) return true;
  if (!edge.resolved) return false;
  const absolute = resolve(edge.resolved);
  return [resolve('services'), resolve('electron'), resolve('src/app')].some(
    (root) => relative(root, absolute).split(/[\\/]/)[0] !== '..',
  );
}

describe('Architektur-Importgrenzen 0.9.1', () => {
  it('löst auch Alias-Imports auf, bevor die Schichtgrenze bewertet wird', () => {
    const edge: ImportEdge = {
      file: 'src/app/features/example.ts',
      specifier: '@services/exampleService',
      resolved: resolveProjectImport('src/app/features/example.ts', '@services/exampleService'),
    };

    expect(isServiceImportFromRenderer(edge)).toBe(true);
  });

  it('hält Renderer und Feature-Module frei von direktem Node-, Electron- und Servicezugriff', () => {
    const violations = allImports()
      .filter((edge) => isServiceImportFromRenderer(edge) || isFeatureImportingElectronBoundary(edge))
      .map((edge) => `${edge.file} -> ${edge.specifier}`)
      .sort();

    expect(violations).toEqual([]);
  });

  it('verhindert Rückimporte aus Services in Renderer-UI und Feature-Komponenten', () => {
    const violations = allImports()
      .filter((edge) => isBackendImportingRenderer(edge) || isDomainImportingPlatformOrRenderer(edge))
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
