import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CaseTreePanel } from '../../src/app/features/cases/CaseTreePanel';
import { CasePrivacyActionDialog } from '../../src/app/features/cases/CasePrivacyActionDialog';
import { CaseProcessDeleteDialog } from '../../src/app/features/cases/CaseProcessDeleteDialog';
import { CaseRegister } from '../../src/app/features/cases/CaseRegister';
import { PersonList } from '../../src/app/features/persons/PersonList';

const noop = () => undefined;

describe('barrierefreie Fall- und Maßnahmen-Lifecycle-Aktionen', () => {
  it('gibt der Löschaktion und dem Datenschutzmarker im Fallbaum zugängliche Namen', () => {
    const html = renderToStaticMarkup(<CaseTreePanel
      selectedCase={{ id: 'case-1', caseNumber: '2026-001', displayName: 'Test', category: 'bem', status: 'offen', priority: 'normal', openedAt: '2026-08-11T00:00:00.000Z', isPseudonymized: false, isLocked: false, personBindingState: 'legacy_unlinked', privacyReviewRequired: false, privacyReviewPriority: 'normal', anonymizationRecommended: false }}
      notes={[]} documents={[]} preventionProcesses={[]}
      bemProcesses={[{ id: 'bem-1', caseId: 'case-1', status: 'abgeschlossen', title: 'BEM', triggerType: 'sonstiges', employeeResponse: 'offen', contactIds: [], createdAt: '', updatedAt: '' }]}
      equalizationProcesses={[]} terminationProcesses={[]} participationProcesses={[]} workplaceAccommodationProcesses={[]}
      selection={{ type: 'overview' }} onSelect={noop} onDeleteProcess={noop}
      formatProcessNodeSubtitle={() => 'Abgeschlossen'} formatNoteDate={(value) => value} formatBytes={() => '0 B'}
    />);
    expect(html).toContain('aria-label="BEM löschen"');
    expect(html).toContain('aria-label="Datenschutzprüfung erforderlich: weitere Speicherung der abgeschlossenen Maßnahme prüfen."');
    expect(html).toContain('>DS</span>');
    expect(html).toContain('title="Datenschutzprüfung erforderlich: Prüfen, ob die weitere Speicherung dieser abgeschlossenen Maßnahme noch erforderlich ist."');
    expect(html).toContain('class="industrial-icon-button privacy-destructive-action case-tree-process-delete"');
  });


  it('macht die Fall-Datenschutzaktion in der Fallliste als benannte Tastaturaktion erreichbar', () => {
    const html = renderToStaticMarkup(<CaseRegister filteredCount={1} visibleCases={[{ id: 'case-1', caseNumber: '2026-001', displayName: 'Test', category: 'bem', status: 'offen', priority: 'normal', openedAt: '2026-08-11T00:00:00.000Z', isPseudonymized: false, isLocked: false, personBindingState: 'legacy_unlinked', privacyReviewRequired: false, privacyReviewPriority: 'normal', anonymizationRecommended: false }]} selectedCaseId="case-1" caseFilter="" onCaseFilterChange={noop} onSelectCase={noop} onCreateCase={noop} onPrivacyAction={noop} page={1} pageCount={1} pageSize={20} onPageChange={noop} />);
    expect(html).toContain('aria-label="Fallakte löschen oder anonymisieren: 2026-001"');
    expect(html).toContain('class="industrial-icon-button privacy-destructive-action case-register-privacy-action"');
    expect(html).toContain('tabindex="0"');
  });

  it('verwendet für Personen, Fallakten und Maßnahmen dasselbe destruktive Aktionsmuster', () => {
    const personHtml = renderToStaticMarkup(<PersonList persons={[{ id: 'person-1', recordKind: 'identified_person', firstName: 'Max', lastName: 'Muster', protectionStatus: 'severely_disabled', statusSource: 'manual', employmentState: 'active_employee', lifecycleState: 'active', createdAt: '', updatedAt: '' }]} selectedId="person-1" onSelect={noop} onEdit={noop} onDelete={noop} />);
    expect(personHtml).toContain('privacy-destructive-action person-list-delete');
    const caseHtml = renderToStaticMarkup(<CaseRegister filteredCount={1} visibleCases={[{ id: 'case-1', caseNumber: '2026-001', displayName: 'Test', category: 'bem', status: 'offen', priority: 'normal', openedAt: '2026-08-11T00:00:00.000Z', isPseudonymized: false, isLocked: false, personBindingState: 'legacy_unlinked', privacyReviewRequired: false, privacyReviewPriority: 'normal', anonymizationRecommended: false }]} selectedCaseId="case-1" caseFilter="" onCaseFilterChange={noop} onSelectCase={noop} onCreateCase={noop} onPrivacyAction={noop} page={1} pageCount={1} pageSize={20} onPageChange={noop} />);
    expect(caseHtml).toContain('privacy-destructive-action case-register-privacy-action');
  });

  it('stellt im Falldialog Anonymisieren und Löschen als explizite Radio-Auswahl bereit', () => {
    const html = renderToStaticMarkup(<CasePrivacyActionDialog open record={{ id: 'case-1', caseNumber: '2026-001', displayName: 'Test', category: 'bem', status: 'offen', priority: 'normal', openedAt: '2026-08-11T00:00:00.000Z', isPseudonymized: false, isLocked: false, personBindingState: 'legacy_unlinked', privacyReviewRequired: false, privacyReviewPriority: 'normal', anonymizationRecommended: false }} onClose={noop} onSubmit={async () => undefined} />);
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('type="radio"');
    expect(html).toContain('Anonymisieren');
    expect(html).toContain('Endgültig löschen');
    expect(html).toContain('case-privacy-action-options');
    expect(html).toContain('case-privacy-action-option is-selected');
    expect(html).toContain('rows="3"');
  });

  it('verlangt im Maßnahmen-Löschdialog Grund und Bestätigung', () => {
    const html = renderToStaticMarkup(<CaseProcessDeleteDialog target={{ id: 'bem-1', processType: 'bem', label: 'BEM' }} onClose={noop} onSubmit={async () => undefined} />);
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('BEM ANONYMISIEREN');
    expect(html).toContain('required=""');
    expect(html).toContain('class="industrial-select case-process-delete-reason"');
  });
});
