import { describe, expect, it } from 'vitest';
import { defaultDsarInput, renderDsarResponseDocument } from '../../services/complianceCenterService';
import type { DataSubjectAccessPrefill } from '../../src/domain/models/compliance.model';

const prefill: DataSubjectAccessPrefill = {
  generatedAt: '2026-05-22T20:39:00.000Z',
  matchReason: 'Automatische Vorbefüllung anhand Name: Max Muster. Treffer: 1 Personenstamm/Personenstämme, 1 Fallakte(n).',
  persons: [{ id: 'person-1', displayName: 'Max Muster', protectionStatus: 'severely_disabled', organizationalUnit: 'IT', location: 'Rostock', statusValidUntil: '2027-12-31', lifecycleState: 'active' }],
  cases: [{ id: 'case-1', caseNumber: 'SBV-2026-001', displayName: 'Arbeitsplatzgestaltung', category: 'arbeitsplatzgestaltung', status: 'in_bearbeitung', priority: 'wichtig', openedAt: '2026-05-01' }],
  deadlines: [{ id: 'deadline-1', title: 'Stellungnahme prüfen', processType: 'case', deadlineType: 'follow_up', status: 'open', severity: 'important', dueAt: '2026-05-30', caseId: 'case-1', legalBasis: '§ 178 Abs. 2 Satz 1 SGB IX' }],
  measures: [{ id: 'measure-1', caseId: 'case-1', type: 'workplace_accommodation', title: 'Hilfsmittel prüfen', status: 'open', riskLevel: 'erhoeht', openedAt: '2026-05-02', dueAt: '2026-05-31', requiresFollowUp: true }],
  importRuns: [{ id: 'import-1', sourceFileName: 'arbeitgeberliste.csv', importedAt: '2026-05-03T08:00:00.000Z', action: 'updated', changedFields: ['protectionStatus', 'statusValidUntil'] }],
  lifecycleEvents: [{ id: 'audit-1', occurredAt: '2026-05-04T09:00:00.000Z', action: 'update', subjectType: 'protected_person', subjectId: 'person-1', purpose: 'Personenverzeichnis: geschützte Person geändert' }],
  freeTextMatches: [{ id: 'case_note:note-1', sourceType: 'case_note', sourceLabel: 'Fallnotiz', title: 'Gesprächsnotiz', caseId: 'case-1', caseNumber: 'SBV-2026-001', occurredAt: '2026-05-05', matchedTerms: ['Max', 'Muster'], matchKind: 'name_or_reference', excerpt: 'Max schildert Barrieren am Arbeitsplatz.', requiresManualReview: true }],
  sourceInventory: [
    { id: 'persons', module: 'Personen', label: 'Personenstamm und Schutzstatus', status: 'found', foundCount: 1, dataCategories: ['Stammdaten', 'Schutzstatus'], purposes: ['Führung des SBV-Personenverzeichnisses'], recipients: ['SBV'], retentionRule: 'Solange erforderlich.', origin: 'Arbeitgeberliste.', releaseMode: 'direct_summary' },
    { id: 'cases', module: 'Fallakten', label: 'Fallakten', status: 'found', foundCount: 1, dataCategories: ['Fallbezug'], purposes: ['SBV-Beratung'], recipients: ['SBV'], retentionRule: 'Nach Fallabschluss prüfen.', origin: 'SBV-Dokumentation.', releaseMode: 'review_required' },
  ],
  reviewItems: [{ id: 'review:case_note:note-1', sourceId: 'cases', sourceLabel: 'Fallnotiz', title: 'Gesprächsnotiz', caseReference: 'SBV-2026-001', recommendation: 'redact_before_release', reason: 'Freitext prüfen.', excerpt: 'Max schildert Barrieren am Arbeitsplatz.' }],
};

describe('Art.-15-DSGVO-Vorbefüllung 0.9.2', () => {
  it('übernimmt strukturierte Personen-, Fallakten-, Fristen-, Maßnahmen-, Import- und Lifecycle-Daten in die SBV-Zuarbeit', () => {
    const body = renderDsarResponseDocument({
      ...defaultDsarInput(),
      requesterName: 'Max Muster',
      subjectPersonId: 'person-1',
      caseReference: 'SBV-2026-001',
      responsibleEntity: 'Musterarbeitgeber GmbH',
      privacyContactRole: 'data_protection_officer',
      privacyContactName: 'Datenschutz Team',
      privacyContactEmail: 'datenschutz@example.invalid',
      requestForwardedAt: '2026-05-22',
      sbvReviewCompleted: true,
      handedOverAt: '2026-05-23',
      handoverRecipient: 'Datenschutz Team',
      prefill,
    }).body;

    expect(body).toContain('# SBV-Zuarbeit zur Art.-15-Auskunft');
    expect(body).toContain('## 5. Pflichtinformationen nach Art. 15 DSGVO');
    expect(body).toContain('### 6.1 Personenstamm / Schutzstatus');
    expect(body).toContain('Max Muster');
    expect(body).toContain('SBV-2026-001');
    expect(body).toContain('Stellungnahme prüfen');
    expect(body).toContain('Hilfsmittel prüfen');
    expect(body).toContain('arbeitgeberliste.csv');
    expect(body).toContain('Personenverzeichnis: geschützte Person geändert');
    expect(body).toContain('## 7. Prüfliste für Schwärzung und Herausgabe');
    expect(body).toContain('Max schildert Barrieren am Arbeitsplatz.');
    expect(body).toContain('Datenschutz Team');
    expect(body).toContain('Automatisierte Entscheidungen / Profiling');
  });

  it('macht fehlende Vorbefüllung ausdrücklich sichtbar statt eine vollständige Zuarbeit vorzutäuschen', () => {
    const body = renderDsarResponseDocument(defaultDsarInput()).body;

    expect(body).toContain('Die SBV-Dateninventur wurde noch nicht ausgeführt');
    expect(body).toContain('Ohne Inventur darf dieses Dokument nicht als vollständige Zuarbeit verwendet werden');
  });
});
