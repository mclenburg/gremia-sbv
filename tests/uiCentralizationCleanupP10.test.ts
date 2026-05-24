import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

type JsxFinding = { file: string; tag: string; line: number; character: number };

function nativeInteractiveLocations(files: string[]): JsxFinding[] {
  const findings: JsxFinding[] = [];

  for (const file of files) {
    const text = source(file);
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) && ts.isIdentifier(node.tagName)) {
        const tag = node.tagName.text;
        if (['button', 'input', 'select', 'textarea', 'label'].includes(tag)) {
          const { line, character } = ast.getLineAndCharacterOfPosition(node.getStart(ast));
          findings.push({ file, tag, line: line + 1, character: character + 1 });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(ast);
  }

  return findings;
}

const finalizedFeatureViews = [
  'src/app/features/contacts/ContactsView.tsx',
  'src/app/features/deadlines/DeadlinesView.tsx',
  'src/app/features/deadlines/DeadlineIcalExportPanel.tsx',
  'src/app/features/deadlines/DeadlineDashboardPanel.tsx',
  'src/app/features/deadlines/DeadlineListView.tsx',
  'src/app/features/equalization/EqualizationView.tsx',
  'src/app/features/reports/ReportsView.tsx'
];

describe('UI-Zentralisierung Patch P10', () => {
  it('zieht weitere produktive Feature-Views auf zentrale UI-Bausteine und entfernt native Controls', () => {
    expect(nativeInteractiveLocations(finalizedFeatureViews)).toEqual([]);

    const contacts = source('src/app/features/contacts/ContactsView.tsx');
    expect(contacts).toContain('WorkbenchPage');
    expect(contacts).toContain('SearchToolbar');
    expect(contacts).toContain('RecordList');
    expect(contacts).toContain('TextInput');
    expect(contacts).toContain('SelectInput');

    const deadlines = source('src/app/features/deadlines/DeadlinesView.tsx');
    expect(deadlines).toContain('WorkbenchPage');
    expect(deadlines).toContain('DateTimeInput');
    expect(deadlines).toContain('CheckboxField');
    expect(deadlines).toContain('IndustrialModal');

    const reports = source('src/app/features/reports/ReportsView.tsx');
    expect(reports).toContain('WorkbenchPage');
    expect(reports).toContain('DateInput');
    expect(reports).toContain('ToolbarButton');
    expect(reports).toContain('EmptyState');
  });

  it('zentralisiert prozessübergreifende Übersichtskarten statt Modulbuttons und lokale Empty-States nachzubauen', () => {
    const processOverview = source('src/app/shared/process/ProcessOverview.tsx');

    expect(processOverview).toContain('WorkbenchPage');
    expect(processOverview).toContain('IndustrialPanel');
    expect(processOverview).toContain('IndustrialSelectionCard');
    expect(processOverview).toContain('WorkbenchSummary');
    expect(processOverview).toContain('EmptyState');
    expect(processOverview).not.toContain('<button');
    expect(processOverview).not.toContain('className="industrial-empty compact"');
  });

  it('dokumentiert die verbindliche zentrale UI-Schicht für Community-Beiträge', () => {
    const architecture = source('docs/ARCHITECTURE.md');
    const contributing = source('CONTRIBUTING.md');
    const readme = source('README.md');

    expect(architecture).toContain('## UI-Zentralisierung und Architektur-Gates');
    expect(architecture).toContain('Native Formularfelder oder Buttons in Feature-Views sind nur noch erlaubt');
    expect(contributing).toContain('UI-Beiträge nutzen zentrale Komponenten');
    expect(readme).toContain('Einheitliche Bedienoberfläche');
  });
});
