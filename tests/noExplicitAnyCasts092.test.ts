import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ignoredDirectories = new Set([
  '.git',
  'dist',
  'dist-electron',
  'node_modules',
  'release',
  'test-results',
]);

const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts']);

function extensionOf(filePath: string) {
  const match = filePath.match(/\.[^.]+$/);
  return match?.[0] ?? '';
}

function collectSourceFiles(directory = '.'): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectSourceFiles(path);
    }

    if (!entry.isFile() || !sourceExtensions.has(extensionOf(entry.name))) {
      return [];
    }

    return [path.replaceAll('\\', '/')];
  });
}

function scriptKindFor(filePath: string) {
  return filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function isExplicitAnyAssertion(node: ts.Node) {
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    return node.type.kind === ts.SyntaxKind.AnyKeyword;
  }
  return false;
}

function findExplicitAnyAssertions(filePath: string) {
  const sourceText = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKindFor(filePath));
  const findings: string[] = [];

  const visit = (node: ts.Node): void => {
    if (isExplicitAnyAssertion(node)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push(`${filePath}:${position.line + 1}:${position.character + 1}`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return findings;
}

describe('Clean-Code-Grenze für TypeScript-Typumgehungen', () => {
  it('verhindert explizite Any-Casts projektweit', () => {
    const findings = collectSourceFiles().flatMap(findExplicitAnyAssertions);

    expect(findings).toEqual([]);
  });
});
