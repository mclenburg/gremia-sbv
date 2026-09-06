import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { CaseRegister } from '../../../../src/app/features/cases/CaseRegister';
import { CaseDetailPanel } from '../../../../src/app/features/cases/CaseDetailPanel';
import { CaseHandoverTransferDialogs } from '../../../../src/app/features/cases/CaseHandoverTransferDialogs';
import { CaseHandoverCockpitView } from '../../../../src/app/features/case-handover/CaseHandoverCockpitView';
import { CaseHandoverCasePicker } from '../../../../src/app/features/case-handover/CaseHandoverCasePicker';
import { ImportPackageReview } from '../../../../src/app/shared/components/ImportExportFeedback';
import { LiveRegionProvider } from '../../../../src/app/shared/a11y/LiveRegionProvider';
import type { CaseRecord } from '../../../../src/domain/models/case.model';
import { descendants, findDescendants, renderComponent, renderElement, visibleText } from '../../../helpers/renderedMarkup';

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

const importPlan = {
  transferKind: 'case_handover' as const,
  defaultMode: 'create_new' as const,
  mergeAllowed: false,
  requiresExplicitDecision: true,
  privacyReviewRequired: true,
  retentionReviewRequired: false,
  safeMatchCount: 0,
  possibleMatchCount: 0,
  conflictCount: 0,
  decisions: [],
};

function noopForm(event?: { preventDefault: () => void }) {
  event?.preventDefault();
}

describe('case handover placement 0.9.2', () => {
  it('führt Übergaben über Register statt alle Arbeitsformulare gleichzeitig anzuzeigen', () => {
    const { markup } = renderElement(createElement(LiveRegionProvider, {
      children: createElement(CaseHandoverCockpitView, {
        cases: [caseRecord],
        onRecordsChanged: async () => undefined,
      }),
    }));
    const text = visibleText(markup);

    expect(markup).toContain('<nav');
    expect(markup).toContain('aria-label="Übergabe-Arbeitsbereiche Navigation"');
    expect(text).toContain('Übersicht');
    expect(text).toContain('Urlaubsvertretung');
    expect(text).toContain('Rückgabe');
    expect(text).toContain('Amtsübergabe');
    expect(text).toContain('Import');
    expect(text).toContain('Protokoll');
    expect(text).toContain('Was ist als Nächstes zu tun?');
    expect(text).not.toContain('Fallakten für die Vertretung');
    expect(text).not.toContain('Erforderliche Fallakten für die Amtsübergabe');
  });

  it('begrenzt große Fallauswahlen auf eine kompakte, filterbare Trefferliste', () => {
    const manyCases = Array.from({ length: 30 }, (_, index) => ({
      ...caseRecord,
      id: `case-${index + 1}`,
      caseNumber: `SBV-2026-${String(index + 1).padStart(3, '0')}`,
      displayName: `Testperson ${index + 1}`,
    }));
    const { markup } = renderComponent(CaseHandoverCasePicker, {
      cases: manyCases,
      selectedIds: [],
      onChange: () => undefined,
      legend: 'Fallakten auswählen',
    });
    const text = visibleText(markup);

    expect(text).toContain('Fallakten filtern');
    expect(text).toContain('20 von 30 Treffern angezeigt');
    expect(text).toContain('SBV-2026-020');
    expect(text).not.toContain('SBV-2026-021');
    expect(text).toContain('Keine Fallakte ausgewählt.');
  });

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
      continueExpiredOpen: false,
      selectedCase: caseRecord,
      onCloseExport: () => undefined,
      onCloseImport: () => undefined,
      onCloseContinueExpired: () => undefined,
      onExport: async () => ({ exported: false, filePath: '', packageId: '', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0 }),
      onSelectImportFile: async () => ({ canceled: true }),
      onInspectImport: async () => ({ valid: true, packageId: 'pkg-1', packageType: 'vacation_handover', createdAt: '2026-05-01T08:00:00.000Z', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0, matches: [], importPlan, isExpired: false, warnings: [] }),
      onImport: async () => undefined,
      onContinueExpired: async () => undefined,
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

  it('fragt die Fortführung abgelaufener Übergabedaten über einen Gremia-Dialog statt Browser-Prompt ab', () => {
    const { markup } = renderComponent(CaseHandoverTransferDialogs, {
      exportOpen: false,
      importOpen: false,
      continueExpiredOpen: true,
      selectedCase: caseRecord,
      onCloseExport: () => undefined,
      onCloseImport: () => undefined,
      onCloseContinueExpired: () => undefined,
      onExport: async () => ({ exported: false, filePath: '', packageId: '', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0 }),
      onSelectImportFile: async () => ({ canceled: true }),
      onInspectImport: async () => ({ valid: true, packageId: 'pkg-1', packageType: 'vacation_handover', createdAt: '2026-05-01T08:00:00.000Z', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0, matches: [], importPlan, isExpired: false, warnings: [] }),
      onImport: async () => undefined,
      onContinueExpired: async () => undefined,
    });

    const text = visibleText(markup);
    expect(text).toContain('Weiterbearbeitung abgelaufener Übergabedaten bestätigen');
    expect(text).toContain('Begründung');
    expect(text).toContain('Abbrechen');
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
