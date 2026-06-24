import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function jsxTags(path: string): string[] {
  const text = readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const tags: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && ts.isIdentifier(node.tagName)) tags.push(node.tagName.text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return tags;
}

describe('Tätigkeitsjournal UI-Architektur 0.9.3-a-r1', () => {
  it('orchestriert über zentrale UI-Bausteine statt native Formular-/Tabellensteuerung in der View', () => {
    const view = readFileSync('src/app/features/activity-journal/ActivityJournalView.tsx', 'utf8');
    const tags = jsxTags('src/app/features/activity-journal/ActivityJournalView.tsx');

    expect(view).toContain('useActivityJournal');
    expect(view).toContain('useConfirmDialog');
    expect(view).toContain('ModuleFeedback');
    expect(view).toContain('FormSection');
    expect(view).toContain('DataTable');
    expect(tags.filter((tag) => ['input', 'select', 'textarea', 'table', 'label'].includes(tag))).toEqual([]);
    expect(view).not.toContain('confirm(');
  });
});
