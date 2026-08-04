import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const preloadPath = path.join(projectRoot, 'electron', 'preload.ts');

function runtimeImports(sourceText: string): string[] {
  const sourceFile = ts.createSourceFile(
    preloadPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) return [];
    if (!ts.isStringLiteral(statement.moduleSpecifier)) return [];
    return [statement.moduleSpecifier.text];
  });
}

describe('0.9.6-l sandboxed preload contract', () => {
  it('hält den Preload ohne lokale Laufzeitimporte selbstständig', () => {
    const sourceText = fs.readFileSync(preloadPath, 'utf8');

    expect(runtimeImports(sourceText)).toEqual(['electron']);
    expect(sourceText).toContain('ipcRenderer.invoke(channel, ...args)');
    expect(sourceText).not.toContain('./ipc/invokeIpc');
  });
});
