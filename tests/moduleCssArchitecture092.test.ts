import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const ignoredDirectories = new Set(['node_modules', 'dist', 'dist-electron', 'release', 'test-results']);
const allowedCssImporters = new Set(['src/main.tsx', 'src/app/App.tsx']);
const appWideCssFiles = new Set([
  'src/app/accessibility.css',
  'src/app/accessibilityLiveRegion.css',
  'src/app/confirmDialog.css',
  'src/app/caseModalResponsive.css',
  'src/app/ui/responsiveDesign.css',
  'src/styles/globals.css',
]);

const centralWorkbenchSelectors = [
  'industrial-workspace-shell',
  'industrial-workspace-nav',
  'industrial-workspace-content',
  'industrial-status-grid',
  'industrial-status-card',
  'industrial-record-card',
  'industrial-selection-card',
  'industrial-empty-state',
  'industrial-tag',
  'workbench-summary',
  'workbench-grid',
  'workbench-list-panel',
  'workbench-detail-panel',
  'workbench-create-panel',
  'industrial-form-grid',
  'industrial-field',
  'industrial-action-row',
  'industrial-panel-header',
];

const centralComponentOnlyClasses = new Set([
  'industrial-workspace-shell',
  'industrial-workspace-nav',
  'industrial-workspace-content',
  'workbench-summary',
  'workbench-grid',
  'workbench-list-panel',
  'workbench-detail-panel',
  'workbench-create-panel',
]);

const allowedCentralComponentClassFiles = new Set([
  'src/app/shared/components/WorkbenchLayout.tsx',
]);

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

function walkFiles(directory: string, predicate: (file: string) => boolean, files: string[] = []): string[] {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const absolute = path.join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      walkFiles(absolute, predicate, files);
    } else if (predicate(absolute)) {
      files.push(toPosix(path.relative(projectRoot, absolute)));
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function sourceFiles(): string[] {
  return walkFiles(path.join(projectRoot, 'src'), (file) => /\.(ts|tsx)$/.test(file));
}

function cleanupCssEntries(): Set<string> {
  const manifestDir = path.join(projectRoot, 'maintenance', 'source-cleanup');
  const entries = new Set<string>();
  if (!existsSync(manifestDir)) return entries;

  for (const file of readdirSync(manifestDir).filter((entry) => entry.endsWith('.json'))) {
    const raw = readFileSync(path.join(manifestDir, file), 'utf8');
    const parsed = JSON.parse(raw) as { files?: string[] };
    for (const item of parsed.files ?? []) {
      if (item.startsWith('src/') && item.endsWith('.css')) {
        entries.add(item);
      }
    }
  }
  return entries;
}

function cssImports(relativeSourceFile: string): string[] {
  const absolute = path.join(projectRoot, relativeSourceFile);
  const sourceText = readFileSync(absolute, 'utf8');
  const source = ts.createSourceFile(relativeSourceFile, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports: string[] = [];

  source.forEachChild((node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.endsWith('.css')) imports.push(specifier);
    }
  });

  return imports;
}

function literalClassNames(relativeSourceFile: string): string[] {
  const absolute = path.join(projectRoot, relativeSourceFile);
  const sourceText = readFileSync(absolute, 'utf8');
  const source = ts.createSourceFile(relativeSourceFile, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const classes: string[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'className' &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      classes.push(...node.initializer.text.split(/\s+/).filter(Boolean));
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return classes;
}

describe('App-weite CSS-Architektur', () => {
  it('verbietet neue modulnahe CSS-Dateien außerhalb der app-weiten Style-Basis', () => {
    const pendingCleanup = cleanupCssEntries();
    const cssFiles = walkFiles(path.join(projectRoot, 'src'), (file) => file.endsWith('.css'));
    const unmanaged = cssFiles.filter((file) => !appWideCssFiles.has(file) && !pendingCleanup.has(file));

    expect(unmanaged).toEqual([]);
  });

  it('lässt CSS-Imports nur am App-Einstieg zu', () => {
    const offenders = sourceFiles()
      .flatMap((file) => cssImports(file).map((specifier) => ({ file, specifier })))
      .filter(({ file }) => !allowedCssImporters.has(file));

    expect(offenders).toEqual([]);
  });

  it('hält Feature-CSS aus dem zentralen App-Import heraus', () => {
    const imports = cssImports('src/app/App.tsx');
    const featureImports = imports.filter((specifier) => specifier.includes('/features/'));

    expect(featureImports).toEqual([]);
  });

  it('definiert zentrale Industrial- und Workbench-Styles ausschließlich in der app-weiten Style-Basis', () => {
    const centralCss = readFileSync(path.join(projectRoot, 'src/app/ui/responsiveDesign.css'), 'utf8');
    const missingCentralSelectors = centralWorkbenchSelectors.filter((selector) => !centralCss.includes(`.${selector}`));
    expect(missingCentralSelectors).toEqual([]);

    const pendingCleanup = cleanupCssEntries();
    const cssFiles = walkFiles(path.join(projectRoot, 'src'), (file) => file.endsWith('.css'))
      .filter((file) => file !== 'src/app/ui/responsiveDesign.css')
      .filter((file) => !pendingCleanup.has(file));

    const duplicateDefinitions = cssFiles.flatMap((file) => {
      const source = readFileSync(path.join(projectRoot, file), 'utf8');
      return centralWorkbenchSelectors
        .filter((selector) => source.includes(`.${selector}`))
        .map((selector) => ({ file, selector }));
    });

    expect(duplicateDefinitions).toEqual([]);
  });

  it('erzwingt zentrale Komponenten für Workspace- und Workbench-Grundgerüste', () => {
    const offenders = sourceFiles()
      .filter((file) => !allowedCentralComponentClassFiles.has(file))
      .flatMap((file) =>
        literalClassNames(file)
          .filter((className) => centralComponentOnlyClasses.has(className))
          .map((className) => ({ file, className }))
      );

    expect(offenders).toEqual([]);
  });
});
