import { describe, expect, it } from 'vitest';
import { CaseRegister } from '../src/app/features/cases/CaseRegister';
import { CaseDetailPanel } from '../src/app/features/cases/CaseDetailPanel';
import { CaseHandoverTransferDialogs } from '../src/app/features/cases/CaseHandoverTransferDialogs';
import { ImportPackageReview } from '../src/app/shared/components/ImportExportFeedback';
import type { CaseRecord } from '../src/app/core/models/case.model';
import { descendants, findDescendants, renderComponent, visibleText } from './helpers/renderedMarkup';

const caseRecord: CaseRecord = {
  id: 'case-1',
  caseNumber: 'SBV-2026-001',
  displayName: 'Demo-Fall',
  category: 'bem',
  status: 'offen',
  priority: 'normal',
  openedAt: '2026-05-01T08:00:00.000Z',
  isPseudonymized: false,
  isLocked: false,
};

function noopForm(event?: { preventDefault: () => void }) {
  event?.preventDefault();
}

describe('case handover placement 0.9.2', () => {
  it('platziert Import global in der Fallliste und Export in der Fallakten-Suchzeile', () => {
    const register = renderComponent(CaseRegister, {
      filteredCount: 1,
      visibleCases: [caseRecord],
      selectedCaseId: 'case-1',
      caseFilter: '',
      onCaseFilterChange: () => undefined,
      onSelectCase: () => undefined,
      onCreateCase: () => undefined,
      onImportHandover: () => undefined,
      page: 1,
      pageCount: 1,
      pageSize: 50,
      onPageChange: () => undefined,
    });
    const detail = renderComponent(CaseDetailPanel, {
      children: 'Fallinhalt',
      searchQuery: '',
      searchOnlySelectedCase: true,
      searchResults: [],
      searchError: '',
      searchInfo: '',
      isSearching: false,
      selectedSearchSourceTypes: [],
      onSearchSubmit: noopForm,
      onSearchQueryChange: () => undefined,
      onSearchOnlySelectedCaseChange: () => undefined,
      onSearchSourceTypesChange: () => undefined,
      onSelectSearchResult: () => undefined,
      onExportHandover: () => undefined,
      canExportHandover: true,
    });

    expect(visibleText(register.markup)).toContain('Übergabe importieren');
    expect(visibleText(detail.markup)).toContain('Übergabe exportieren');
    expect(descendants(detail.tree).some((node) => node.attrs.class?.includes('case-detail-search-actions'))).toBe(true);
    expect(descendants(detail.tree).some((node) => node.attrs.class?.includes('case-detail-handover-export-button'))).toBe(true);
  });

  it('rendert modale Übergabe-Dialoge mit getrennter Dateiauswahl und Paketprüfung', () => {
    const { markup, tree } = renderComponent(CaseHandoverTransferDialogs, {
      exportOpen: false,
      importOpen: true,
      selectedCase: caseRecord,
      onCloseExport: () => undefined,
      onCloseImport: () => undefined,
      onExport: async () => ({ exported: false, filePath: '', packageId: '', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0 }),
      onSelectImportFile: async () => ({ canceled: true }),
      onInspectImport: async () => ({ valid: true, packageId: 'pkg-1', createdAt: '2026-05-01T08:00:00.000Z', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0, matches: [], isExpired: false, warnings: [] }),
      onImport: async () => undefined,
    });

    const text = visibleText(markup);
    expect(text).toContain('Datei auswählen');
    expect(text).toContain('Paket prüfen');
    const buttons = findDescendants(tree, (node) => node.tag === 'button');
    const importButton = buttons.find((button) => button.attrs.type === 'submit');

    expect(importButton?.attrs.disabled).toBe('');
    expect(importButton).toBeTruthy();
    expect(descendants(tree).some((node) => node.attrs.class?.includes('handover-import-file-step'))).toBe(true);
    expect(descendants(tree).some((node) => node.attrs.class?.includes('handover-import-inspect-actions'))).toBe(true);
  });

  it('macht die Importentscheidung nach Paketprüfung explizit sichtbar', () => {
    const { markup } = renderComponent(ImportPackageReview, {
      caseCount: 1,
      measureCount: 2,
      documentCount: 3,
      deadlineCount: 4,
      validUntilLabel: '31.05.2026',
      matches: [{ id: 'case-1', label: 'SBV-2026-001 · Demo-Fall', reasonLabel: 'Aktenzeichen' }],
      mode: 'merge_existing',
      targetId: 'case-1',
      onModeChange: () => undefined,
      onTargetChange: () => undefined,
    });

    const text = visibleText(markup);
    expect(text).toContain('Als neue lokale Übergabeakte anlegen');
    expect(text).toContain('Mit bestehender Fallakte zusammenführen/aktualisieren');
    expect(text).toContain('Gewählte Zusammenführung: SBV-2026-001 · Demo-Fall');
  });
});
