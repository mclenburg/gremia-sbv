import { describe, expect, it } from 'vitest';
import { defaultDsarInput, renderDsarResponseDocument } from '../services/complianceCenterService';
import type { DataSubjectAccessPrefill } from '../src/app/core/models/compliance.model';

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
};

describe('Art.-15-DSGVO-Vorbefüllung 0.9.2', () => {
  it('übernimmt strukturierte Personen-, Fallakten-, Fristen-, Maßnahmen-, Import- und Lifecycle-Daten in den Auskunftsentwurf', () => {
    const body = renderDsarResponseDocument({
      ...defaultDsarInput(),
      requesterName: 'Max Muster',
      caseReference: 'SBV-2026-001',
      prefill,
    }).body;

    expect(body).toContain('## 5. Automatisch vorbefüllte Daten aus Gremia.SBV');
    expect(body).toContain('### 5.1 Personenstamm / Schutzstatus');
    expect(body).toContain('Max Muster');
    expect(body).toContain('SBV-2026-001');
    expect(body).toContain('Stellungnahme prüfen');
    expect(body).toContain('Hilfsmittel prüfen');
    expect(body).toContain('arbeitgeberliste.csv');
    expect(body).toContain('Personenverzeichnis: geschützte Person geändert');
    expect(body).toContain('### 5.7 Freitext-Fundstellen');
    expect(body).toContain('Max schildert Barrieren am Arbeitsplatz.');
  });

  it('macht fehlende Vorbefüllung ausdrücklich sichtbar statt einen leeren Vollauskunftsanschein zu erzeugen', () => {
    const body = renderDsarResponseDocument(defaultDsarInput()).body;

    expect(body).toContain('Keine automatische Vorbefüllung ausgeführt');
    expect(body).toContain('Daten aus Gremia.SBV vorbefüllen');
  });
});
