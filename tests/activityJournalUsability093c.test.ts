import { describe, expect, it } from 'vitest';
import { buildTimeSuggestionFromStartTime, applyTimeSuggestion } from '../src/app/features/activity-journal/activityJournalTimeSuggestion';
import { createEmptyActivityJournalForm, formFromActivityJournalPrefill } from '../src/app/features/activity-journal/hooks/useActivityJournal';
import { buildActivitySuggestionLabel, minutesSince, shouldOfferActivitySuggestion } from '../src/app/features/activity-journal/hooks/useActivityJournalSessionSuggestion';
import { resolveActivityJournalWeekReviewMarker } from '../src/app/features/dashboard/dashboardFocusPolicy';
import { buildFromContext } from '../services/activityJournalPrefill';

describe('activity journal usability 0.9.3-c', () => {
  it('bietet aus einzelner Startzeit nur einen flüchtigen Übernahmevorschlag an', () => {
    const suggestion = buildTimeSuggestionFromStartTime({
      entryDate: '2026-07-01',
      value: '09:15',
      now: new Date('2026-07-01T10:42:00'),
    });

    expect(suggestion?.label).toBe('Bis jetzt: 09:15-10:42, 87 Minuten übernehmen?');
    const form = createEmptyActivityJournalForm();
    expect(form.timeMode).toBe('duration');

    const applied = applyTimeSuggestion(form, suggestion!);
    expect(applied.timeMode).toBe('range');
    expect(applied.startedAt).toBe('2026-07-01T09:15');
    expect(applied.endedAt).toBe('2026-07-01T10:42');
    expect(applied.durationMinutes).toBe('87');
  });

  it('verwirft ungültige oder rückwärts laufende Startzeit-Vorschläge', () => {
    expect(buildTimeSuggestionFromStartTime({ entryDate: '2026-07-01', value: '24:01', now: new Date('2026-07-01T10:42:00') })).toBeNull();
    expect(buildTimeSuggestionFromStartTime({ entryDate: '2026-07-01', value: '10:43', now: new Date('2026-07-01T10:42:00') })).toBeNull();
    expect(buildTimeSuggestionFromStartTime({ entryDate: '2026-07-01', value: '/zeit 45m Text', now: new Date('2026-07-01T10:42:00') })).toBeNull();
  });

  it('zeigt ephemere Kontextvorschläge erst nach Mindestdauer und vorhandener Journalhistorie', () => {
    const openedAt = new Date('2026-07-01T09:00:00').getTime();
    const afterNineMinutes = new Date('2026-07-01T09:09:59').getTime();
    const afterTenMinutes = new Date('2026-07-01T09:10:00').getTime();

    expect(minutesSince(openedAt, afterNineMinutes)).toBe(9);
    expect(shouldOfferActivitySuggestion({ hasPersistentJournalHistory: false, openedAt, now: afterTenMinutes })).toBe(false);
    expect(shouldOfferActivitySuggestion({ hasPersistentJournalHistory: true, openedAt, now: afterNineMinutes })).toBe(false);
    expect(shouldOfferActivitySuggestion({ hasPersistentJournalHistory: true, openedAt, now: afterTenMinutes })).toBe(true);
    expect(buildActivitySuggestionLabel({ contextType: 'case', caseNumber: 'SBV-2026-004' }, 12)).toBe('Tätigkeit erfassen? 12 Minuten in SBV-2026-004.');
  });

  it('trägt den Kontexttyp als Kategoriepräferenz-Kontext in die UI-Form, ohne Fall-ID zu speichern', () => {
    const prefill = buildFromContext({ contextType: 'bem_process', contextId: 'bem-1', caseId: 'case-1', caseNumber: 'SBV-2026-004' });
    const form = formFromActivityJournalPrefill(prefill);

    expect(prefill.preferenceContextType).toBe('bem_process');
    expect(form.preferenceContextType).toBe('bem_process');
    expect(JSON.stringify(prefill)).not.toContain('Max Mustermann');
  });

  it('erzeugt den Wochenabschlussmarker nur bei Historie, Aktivität und ohne Eintrag der Vorwoche', () => {
    expect(resolveActivityJournalWeekReviewMarker({ hasJournalHistory: false, lastWeekEntryCount: 0, hasDashboardActivity: true }).visible).toBe(false);
    expect(resolveActivityJournalWeekReviewMarker({ hasJournalHistory: true, lastWeekEntryCount: 1, hasDashboardActivity: true }).visible).toBe(false);
    expect(resolveActivityJournalWeekReviewMarker({ hasJournalHistory: true, lastWeekEntryCount: 0, hasDashboardActivity: false }).visible).toBe(false);
    expect(resolveActivityJournalWeekReviewMarker({ hasJournalHistory: true, lastWeekEntryCount: 0, hasDashboardActivity: true, hasHigherPriorityCriticalMarker: true }).visible).toBe(false);
    const marker = resolveActivityJournalWeekReviewMarker({ hasJournalHistory: true, lastWeekEntryCount: 0, hasDashboardActivity: true });
    expect(marker.visible).toBe(true);
    expect(marker.description).toBe('Für die vergangene Woche sind keine Tätigkeiten dokumentiert. Bei Bedarf jetzt nacherfassen.');
  });
});
