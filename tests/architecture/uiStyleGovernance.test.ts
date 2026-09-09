import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

type UiStyleBaseline = {
  hardcodedHexOutsideDesignTokens: number;
  focusVisibleOccurrences: number;
  uniqueFontSizeValues: number;
  uniquePaddingValues: number;
  nativeFormControlsWithoutExplicitClassName: number;
  allowedMediaBreakpoints: string[];
};

const projectRoot = process.cwd();
const ignoredDirectories = new Set(['node_modules', 'dist', 'dist-electron', 'release', 'test-results']);
const baseline = JSON.parse(
  readFileSync(path.join(projectRoot, 'maintenance/architecture/ui-style-baseline.json'), 'utf8'),
) as UiStyleBaseline;

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

function walkFiles(directory: string, predicate: (file: string) => boolean, files: string[] = []): string[] {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const absolute = path.join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) walkFiles(absolute, predicate, files);
    else if (predicate(absolute)) files.push(toPosix(path.relative(projectRoot, absolute)));
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function appCssFiles(): string[] {
  return walkFiles(path.join(projectRoot, 'src/app'), (file) => file.endsWith('.css'));
}

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function cssSources(files = appCssFiles()): string {
  return files.map(readProjectFile).join('\n');
}

function uniqueComponentDeclarationValues(propertyName: 'font-size' | 'padding'): string[] {
  const pattern = new RegExp(`${propertyName}\\s*:\\s*([^;]+);`, 'g');
  const componentCss = cssSources(appCssFiles().filter((file) => !file.endsWith('/designTokens.css')));
  return [...new Set(
    [...componentCss.matchAll(pattern)]
      .map((match) => match[1].trim())
      .filter((value) => !value.includes('var(')),
  )].sort((a, b) => a.localeCompare(b));
}

function collectLegacyTokenReferences(): string[] {
  const forbiddenToken = /var\(--(?:sbv-[\w-]+|accent|surface[\w-]*|border[\w-]*|text[\w-]*|panel[\w-]*|warning[\w-]*|color[\w-]*)\)/g;
  return appCssFiles()
    .filter((file) => !file.endsWith('/designTokens.css'))
    .flatMap((file) => [...readProjectFile(file).matchAll(forbiddenToken)].map((match) => `${file}: ${match[0]}`));
}

function findJsxAttribute(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  name: string,
): ts.JsxAttribute | undefined {
  return node.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute => (
      ts.isJsxAttribute(attribute) &&
      ts.isIdentifier(attribute.name) &&
      attribute.name.text === name
    ),
  );
}

function collectNativeFormControlsWithoutClassName(): string[] {
  return walkFiles(path.join(projectRoot, 'src/app'), (file) => file.endsWith('.tsx')).flatMap((file) => {
    const source = ts.createSourceFile(file, readProjectFile(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const findings: string[] = [];

    function visit(node: ts.Node): void {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(source);
        if (['input', 'select', 'textarea', 'button'].includes(tagName)) {
          const typeAttribute = findJsxAttribute(node, 'type');
          const hiddenInput = tagName === 'input' && typeAttribute?.getText(source).includes('hidden');
          if (!hiddenInput && !findJsxAttribute(node, 'className')) {
            const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            findings.push(`${file}:${line} <${tagName}>`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
    return findings;
  });
}

function collectInlineStyleAttributes(): string[] {
  return walkFiles(path.join(projectRoot, 'src/app'), (file) => file.endsWith('.tsx')).flatMap((file) => {
    const source = ts.createSourceFile(file, readProjectFile(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const findings: string[] = [];

    function visit(node: ts.Node): void {
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === 'style') {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        findings.push(`${file}:${line}`);
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
    return findings;
  });
}

function collectMalformedTokenDeclarations(): string[] {
  return appCssFiles().flatMap((file) => {
    const source = readProjectFile(file);
    return source
      .split('\n')
      .flatMap((line, index) => {
        const declaration = line.trim();
        const malformedDirectTokenDeclaration = /^[\w-]+\s*:\s*(?:[^();]+\s+)*var\(--[\w-]+\)\);$/;
        return malformedDirectTokenDeclaration.test(declaration)
          ? [`${file}:${index + 1} ${declaration}`]
          : [];
      });
  });
}

function collectNonInteractiveCardHoverSelectors(): string[] {
  const allowedInteractiveMarkers = [
    'button.industrial-card',
    'a.industrial-card',
    ".industrial-card[role='button']",
    '.industrial-card[role="button"]',
    '.industrial-card.clickable',
  ];

  return appCssFiles().flatMap((file) => {
    const source = readProjectFile(file);
    return [...source.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap((match) => {
      const selectorGroup = match[1];
      if (!selectorGroup.includes('.industrial-card') || !selectorGroup.includes(':hover')) return [];
      return selectorGroup
        .split(',')
        .map((selector) => selector.trim())
        .filter((selector) => selector.includes('.industrial-card') && selector.includes(':hover'))
        .filter((selector) => !allowedInteractiveMarkers.some((marker) => selector.includes(marker)))
        .map((selector) => `${file}: ${selector}`);
    });
  });
}

describe('UI-Styleguide-Governance', () => {
  it('friert harte CSS-Altlasten als Ratchet ein', () => {
    const cssFiles = appCssFiles();
    const cssWithoutDesignTokens = cssSources(cssFiles.filter((file) => !file.endsWith('/designTokens.css')));

    expect([...cssWithoutDesignTokens.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].length).toBeLessThanOrEqual(
      baseline.hardcodedHexOutsideDesignTokens,
    );
    expect([...cssSources(cssFiles).matchAll(/:focus-visible\b/g)].length).toBeLessThanOrEqual(
      baseline.focusVisibleOccurrences,
    );
    expect(uniqueComponentDeclarationValues('font-size').length).toBeLessThanOrEqual(baseline.uniqueFontSizeValues);
    expect(uniqueComponentDeclarationValues('padding').length).toBeLessThanOrEqual(baseline.uniquePaddingValues);
  });

  it('verwendet außerhalb der Token-Definition keine alten SBV- oder Alias-Token', () => {
    expect(collectLegacyTokenReferences()).toEqual([]);
  });

  it('verbietet neue undokumentierte CSS-Breakpoints', () => {
    const breakpointPattern = /@media[^\n{]+(?:max|min)-width\s*:\s*([^)]+)\)/g;
    const breakpoints = [...new Set([...cssSources().matchAll(breakpointPattern)].map((match) => match[1].trim()))].sort();

    expect(breakpoints.filter((breakpoint) => !baseline.allowedMediaBreakpoints.includes(breakpoint))).toEqual([]);
  });

  it('verhindert neue native Formular-Controls ohne explizite zentrale Klasse', () => {
    expect(collectNativeFormControlsWithoutClassName().length).toBeLessThanOrEqual(
      baseline.nativeFormControlsWithoutExplicitClassName,
    );
  });

  it('hält Inline-Styles im Renderer verboten', () => {
    expect(collectInlineStyleAttributes()).toEqual([]);
  });

  it('verhindert malformed CSS-Token-Deklarationen', () => {
    expect(collectMalformedTokenDeclarations()).toEqual([]);
  });

  it('beschränkt industrial-card-Hover appweit auf interaktive Karten', () => {
    expect(collectNonInteractiveCardHoverSelectors()).toEqual([]);
  });
});
