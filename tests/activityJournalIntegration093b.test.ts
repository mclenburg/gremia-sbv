import { describe, expect, it } from 'vitest';
import { applyActivityJournalTextCommand } from '../src/app/features/activity-journal/activityJournalTextCommands';
import { createEmptyActivityJournalForm, formFromActivityJournalPrefill } from '../src/app/features/activity-journal/hooks/useActivityJournal';
import { buildFromContext, buildFromClosedJournalDeadline } from '../services/activityJournalPrefill';

describe('activity journal integration 0.9.3-b', () => {
  it('übernimmt /zeit als Dauer und entfernt den Befehl aus der Kurzbeschreibung', () => {
    const form = { ...createEmptyActivityJournalForm(), title: '', description: '/zeit 45m Unterlagen für BEM-Gespräch geprüft' };

    const result = applyActivityJournalTextCommand(form, form.description);

    expect(result.changed).toBe(true);
    expect(result.form.timeMode).toBe('duration');
    expect(result.form.durationMinutes).toBe('45');
    expect(result.form.title).toBe('Unterlagen für BEM-Gespräch geprüft');
    expect(result.form.description).toBe('Unterlagen für BEM-Gespräch geprüft');
  });

  it('übernimmt /t als Zeitraum und berechnet die Dauer aus dem Branch', () => {
    const form = { ...createEmptyActivityJournalForm(), title: '', entryDate: '2026-07-01', description: '/t 09:15-10:05 Stellungnahme vorbereitet' };

    const result = applyActivityJournalTextCommand(form, form.description);

    expect(result.changed).toBe(true);
    expect(result.form.timeMode).toBe('range');
    expect(result.form.startedAt).toBe('2026-07-01T09:15');
    expect(result.form.endedAt).toBe('2026-07-01T10:05');
    expect(result.form.durationMinutes).toBe('50');
  });

  it('übernimmt // im Journalkontext als fallfreie Wiedervorlage statt als Fallfrist', () => {
    const form = { ...createEmptyActivityJournalForm(), title: '', description: '// 2026-07-08 Rückmeldung HR nachhalten' };

    const result = applyActivityJournalTextCommand(form, form.description);

    expect(result.changed).toBe(true);
    expect(result.form.status).toBe('follow_up_open');
    expect(result.form.followUpDueAt).toBe('2026-07-08');
    expect(result.form.resultNote).toBe('Rückmeldung HR nachhalten');
  });

  it('baut Kontext-Prefill für BEM mit Prozess- und Falllink ohne Persistenz', () => {
    const prefill = buildFromContext({ contextType: 'bem_process', contextId: 'bem-1', caseId: 'case-1', title: 'BEM Max' });

    expect(prefill.entry.createdFrom).toBe('context_prefill');
    expect(prefill.entry.category).toBe('bem_preparation');
    expect(prefill.entry.links).toEqual([
      { targetType: 'bem_process', targetId: 'bem-1' },
      { targetType: 'case', targetId: 'case-1' },
    ]);
    expect(prefill.privacyNotice).toContain('noch kein Journaleintrag gespeichert');
  });

  it('wandelt erledigte Journal-Wiedervorlagen in Ergebnisdokumentations-Prefill um', () => {
    const prefill = buildFromClosedJournalDeadline({ id: 'deadline-1', title: 'Rückmeldung HR prüfen', processType: 'activity_journal', processId: 'journal-1' });

    expect(prefill.entry.title).toBe('Journal-Wiedervorlage: Ergebnis dokumentiert');
    expect(prefill.entry.resultNote).toContain('Rückmeldung HR prüfen');
  });

  it('füllt eine UI-Form aus Prefill ohne automatische Export- oder Speicherentscheidung', () => {
    const form = formFromActivityJournalPrefill(buildFromContext({ contextType: 'case', contextId: 'case-1', caseNumber: 'SBV-2026-004' }));

    expect(form.title).toBe('SBV-2026-004: Tätigkeit dokumentiert');
    expect(form.category).toBe('case_work');
    expect(form.timeMode).toBe('none');
    expect(form.followUpDueAt).toBe('');
  });
});
