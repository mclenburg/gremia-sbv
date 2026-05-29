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
  'src/app/features/deadlines/DeadlineCreateModal.tsx',
  'src/app/features/deadlines/DeadlineIcalExportPanel.tsx',
  'src/app/features/deadlines/DeadlineDashboardPanel.tsx',
  'src/app/features/deadlines/DeadlineListView.tsx',
  'src/app/features/equalization/EqualizationView.tsx',
  'src/app/features/reports/ReportsView.tsx',
  'src/app/features/templates/TemplatesView.tsx',
  'src/app/features/templates/TemplateEditorModal.tsx',
  'src/app/features/templates/TemplateCatalogPanels.tsx',
  'src/app/features/templates/TemplateHelpModal.tsx',
  'src/app/features/settings/SettingsHub.tsx'
];

describe('UI-Zentralisierung Patch P10', () => {
  it('zieht weitere produktive Feature-Views auf zentrale UI-Bausteine und entfernt native Controls', () => {
    expect(nativeInteractiveLocations(finalizedFeatureViews)).toEqual([]);

    const contacts = source('src/app/features/contacts/ContactsView.tsx');
    const contactCreate = source('src/app/features/contacts/ContactCreateModal.tsx');
    expect(contacts).toContain('WorkbenchPage');
    expect(contacts).toContain('SearchToolbar');
    expect(contacts).toContain('RecordList');
    expect(contacts).toContain('ContactCreateModal');
    expect(contactCreate).toContain('TextInput');
    expect(contactCreate).toContain('SelectInput');
    expect(contactCreate).toContain('IndustrialModal');

    const deadlines = source('src/app/features/deadlines/DeadlinesView.tsx');
    const deadlineCreate = source('src/app/features/deadlines/DeadlineCreateModal.tsx');
    const deadlineExport = source('src/app/features/deadlines/DeadlineIcalExportPanel.tsx');
    expect(deadlines).toContain('WorkbenchPage');
    expect(deadlines).toContain('WorkbenchSummary');
    expect(deadlines).toContain('DeadlineCreateModal');
    expect(deadlineCreate).toContain('DateTimeInput');
    expect(deadlineCreate).toContain('CheckboxField');
    expect(deadlineCreate).toContain('IndustrialModal');
    expect(deadlineExport).toContain('IndustrialModal');

    const reports = source('src/app/features/reports/ReportsView.tsx');
    expect(reports).toContain('WorkbenchPage');
    expect(reports).toContain('DateInput');
    expect(reports).toContain('ToolbarButton');
    expect(reports).toContain('EmptyState');

    const templates = source('src/app/features/templates/TemplatesView.tsx');
    const templateEditor = source('src/app/features/templates/TemplateEditorModal.tsx');
    const templateCatalog = source('src/app/features/templates/TemplateCatalogPanels.tsx');
    expect(templates).toContain('TemplateEditorModal');
    expect(templateEditor).toContain('IndustrialModal');
    expect(templateEditor).toContain('TextInput');
    expect(templateEditor).toContain('TextareaInput');
    expect(templateCatalog).toContain('ToolbarButton');
    expect(templateCatalog).toContain('IconButton');
    expect(source('src/app/features/templates/TemplateHelpModal.tsx')).toContain('IndustrialModal');

    const settingsHub = source('src/app/features/settings/SettingsHub.tsx');
    const settingsNavigation = source('src/app/features/settings/settingsNavigation.ts');
    expect(settingsHub).toContain('ToolbarButton');
    expect(settingsNavigation).toContain('settings-security');
    expect(settingsNavigation).toContain('settings-data-protection');
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
