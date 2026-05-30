import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { recordMatchesQuery } from '../src/app/shared/components/WorkbenchLayout';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function uiCss(): string {
  return [
    'src/app/ui/designTokens.css',
    'src/app/ui/base.css',
    'src/app/ui/appShell.css',
    'src/app/ui/components.css',
  'src/app/ui/modal.css',
    'src/app/ui/workbench.css',
    'src/app/ui/processes.css',
    'src/app/ui/featureModules.css',
    'src/app/ui/responsiveDesign.css',
    'src/app/ui/forms.css',

  ].map((file) => source(file)).join('\n');
}

function featureSources(dir: string): string {
  const chunks: string[] = [];
  function visit(path: string) {
    for (const entry of readdirSync(path)) {
      const child = `${path}/${entry}`;
      if (statSync(child).isDirectory()) {
        visit(child);
      } else if (child.endsWith('.ts') || child.endsWith('.tsx')) {
        chunks.push(source(child));
      }
    }
  }
  visit(dir);
  return chunks.join('\n');
}

describe('Listen-, Such- und Tabellenzentralisierung Patch P7', () => {
  it('stellt Suchleiste, Filterbar, RecordList, DataTable und EmptyState zentral bereit', () => {
    const layout = source('src/app/shared/components/WorkbenchLayout.tsx');
    const css = uiCss();

    for (const component of ['SearchToolbar', 'FilterBar', 'RecordList', 'DataTable', 'EmptyState']) {
      expect(layout).toContain(`function ${component}`);
    }

    for (const selector of ['.industrial-search-toolbar', '.industrial-filter-bar', '.industrial-record-list-item', '.industrial-data-table', '.industrial-empty-state']) {
      expect(css).toContain(selector);
    }
  });

  it('filtert zentrale RecordLists positiv und negativ über normalisierte Suchwerte', () => {
    expect(recordMatchesQuery(['SBV-Schulung', '§ 179 Abs. 4 SGB IX'], 'schulung')).toBe(true);
    expect(recordMatchesQuery(['Datenschutzvorfall', 'reported', 'high'], 'REPORT')).toBe(true);
    expect(recordMatchesQuery(['Datenschutzvorfall', 'closed', 'low'], 'mittel')).toBe(false);
    expect(recordMatchesQuery(['Nachweis'], '   ')).toBe(true);
  });

  it('zieht Compliance und SBV-Steuerung auf zentrale Such-, Listen- und Tabellenbausteine', () => {
    const compliance = featureSources('src/app/features/compliance');
    const sbvControl = featureSources('src/app/features/sbv-control');

    expect(compliance).toContain('SearchToolbar');
    expect(compliance).toContain('RecordList');
    expect(compliance).toContain('recordMatchesQuery');
    expect(compliance).not.toContain('className="industrial-empty-state"');

    expect(sbvControl).toContain('SearchToolbar');
    expect(sbvControl).toContain('RecordList');
    expect(sbvControl).toContain('DataTable');
    expect(sbvControl).toContain('recordMatchesQuery');
    expect(sbvControl).not.toContain('function EmptyState({ text }');
    expect(sbvControl).not.toContain('className="sbv-control-table"');
    expect(sbvControl).not.toContain('sbv-control-empty');
  });
});
