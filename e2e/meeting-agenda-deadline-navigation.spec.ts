import { test, expect } from './support/test';

async function createAgendaDeadline(page: import('@playwright/test').Page, sourceEvent: string, processId?: string) {
  return page.evaluate(async ({ sourceEvent, processId }) => {
    const meeting = await window.gremiaSbv.sbvOffice.meetings.create({
      meetingType: 'works_council', title: 'E2E Sitzung mit Frist', startsAt: '2026-05-18T10:00:00.000Z',
    });
    await window.gremiaSbv.sbvOffice.meetings.saveAgenda(meeting.id, { id: 'agenda-first-e2e', title: 'Erster TOP', position: 1, sbvRelevance: true });
    const target = await window.gremiaSbv.sbvOffice.meetings.saveAgenda(meeting.id, {
      id: 'agenda-second-e2e', title: 'Zweiter TOP mit Frist', position: 2, sbvRelevance: true, requestContent: 'SBV-Antrag nachhalten',
    });
    await window.gremiaSbv.deadlines.create({
      processId: processId ?? target.id, processType: 'sbv_meeting', deadlineType: 'follow_up',
      title: sourceEvent === 'Beschlussfassung' ? 'E2E Aussetzungsfrist' : 'E2E TOP-Antrag nachhalten',
      dueAt: '2026-05-20T10:00:00.000Z', sourceEvent,
      severity: 'important', calculationMode: 'workflow', isLegalDeadline: false,
    });
    return target.id;
  }, { sourceEvent, processId });
}

for (const [sourceEvent, title, heading] of [
  ['sbv_meeting_top_follow_up', 'E2E TOP-Antrag nachhalten', 'TOP-Antrag & Reaktion'],
  ['Beschlussfassung', 'E2E Aussetzungsfrist', 'Beschlussbeobachtung & Aussetzung'],
] as const) {
  test(`opens ${sourceEvent} at its agenda item`, async ({ page }) => {
    const agendaId = await createAgendaDeadline(page, sourceEvent);
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fristen', exact: true }).click();
    const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: title });
    await row.getByRole('button', { name: 'Tagesordnungspunkt öffnen' }).click();
    await expect(page.getByRole('heading', { name: 'E2E Sitzung mit Frist' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'TOP bearbeiten: Zweiter TOP mit Frist' })).toBeVisible();
    await expect(page.getByRole('heading', { name: heading })).toBeFocused();
    await expect(page.locator(`#agenda-${agendaId}-legend`)).toBeVisible();
  });
}

test('reports a missing linked agenda item', async ({ page }) => {
  await createAgendaDeadline(page, 'sbv_meeting_top_follow_up', 'missing-agenda');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'E2E TOP-Antrag nachhalten' });
  await row.getByRole('button', { name: 'Tagesordnungspunkt öffnen' }).click();
  await expect(page.getByText('Der verknüpfte Tagesordnungspunkt ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.')).toBeVisible();
  await expect(page.getByRole('group', { name: 'TOP bearbeiten: Zweiter TOP mit Frist' })).toHaveCount(0);
});
