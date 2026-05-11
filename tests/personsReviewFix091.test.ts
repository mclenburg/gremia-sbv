import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';

describe('0.9.1 Review-Korrekturen im Personen- und Fallanlage-UX', () => {
  it('führt anonyme Beratung als Fallvorgang im CaseCreateModal, nicht als Personen-Dropdown', () => {
    const source = readNormalizedSourceText('src/app/features/cases/CaseCreateModal.tsx');
    expect(source).toContain('Für anonyme Beratungsgespräche ohne Namensnennung: Fallakte ohne Personenbezug anlegen.');
    expect(source).toContain('Ohne Personenbezug dokumentieren →');
    expect(source).toContain('Person auswählen →');
    expect(source).not.toContain('<option value="__anonymous_request__">');
    expect(source).not.toContain('pseudonymen Personenstamm ohne Direktidentifikatoren');
  });

  it('entfernt Versionskicker aus der Personen-UI und priorisiert kritische Lifecycle-Zustände visuell', () => {
    const view = readNormalizedSourceText('src/app/features/persons/PersonsView.tsx');
    const list = readNormalizedSourceText('src/app/features/persons/PersonList.tsx');
    expect(view).not.toContain('0.9.1 · Datenschutz-Lifecycle');
    expect(view).toContain('kicker="Datenschutz-Lifecycle"');
    expect(list).toContain('person-lifecycle-${severity}');
    expect(list).toContain("if (state === 'expired_review_required' || state === 'anonymization_pending') return 'critical';");
    expect(list).toContain('AlertTriangle');
    expect(list).toContain('person-lifecycle-badge');
  });

  it('zeigt in PersonDetail nur die verknüpften Fallakten der ausgewählten Person', () => {
    const source = readNormalizedSourceText('src/app/features/persons/PersonDetail.tsx');
    expect(source).toContain('record.protectedPersonId === person.id');
    expect(source).toContain('Verknüpfte Fallakten: {linkedCaseCount}');
    expect(source).not.toContain('Verfügbare Fallakten: {cases.length}');
  });

  it('gibt beim Statusablauf-Prüfen ein konkretes Ergebnis und sperrt den Button während der Prüfung', () => {
    const card = readNormalizedSourceText('src/app/features/persons/PersonExpiryDashboardCard.tsx');
    const view = readNormalizedSourceText('src/app/features/persons/PersonsView.tsx');
    expect(card).toContain('aria-busy={evaluating}');
    expect(card).toContain('Prüfung läuft …');
    expect(card).toContain('lastEvaluationMessage');
    expect(view).toContain('Alle Statusabläufe sind aktuell.');
    expect(view).toContain('neue Ablaufwarnungen');
  });
});
