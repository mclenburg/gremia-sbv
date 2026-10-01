import { test, expect } from './support/test';

async function createDeadline(page: import('@playwright/test').Page, sourceEvent: string, processId?: string) {
  return page.evaluate(async ({ sourceEvent, processId }) => {
    const recordId = processId ?? (await window.gremiaSbv.sbvOffice.agreements.save({ title: 'E2E Verhandlungsakte', status: 'negotiation_requested' })).id;
    await window.gremiaSbv.deadlines.create({
      processId: recordId, processType: 'inclusion_agreement', deadlineType: 'follow_up',
      title: sourceEvent === 'inclusion_agreement_review' ? 'E2E Evaluation' : 'E2E Verhandlungsantwort',
      dueAt: '2026-05-20T10:00:00.000Z', sourceEvent,
      severity: 'important', calculationMode: 'workflow', isLegalDeadline: false,
    });
    return recordId;
  }, { sourceEvent, processId });
}

for (const [sourceEvent, title, heading] of [
  ['inclusion_agreement_negotiation_request', 'E2E Verhandlungsantwort', 'Verhandlung anstoßen'],
  ['inclusion_agreement_review', 'E2E Evaluation', 'Evaluation und Übermittlung'],
] as const) {
  test(`opens ${sourceEvent} at its agreement and source section`, async ({ page }) => {
    const recordId = await createDeadline(page, sourceEvent);
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fristen', exact: true }).click();
    const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: title });
    await row.getByRole('button', { name: 'Verhandlungsakte öffnen' }).click();
    await expect(page.getByLabel('Verhandlungsakte', { exact: true })).toHaveValue(recordId);
    await expect(page.getByRole('heading', { name: heading })).toBeFocused();
  });
}

test('reports a missing linked agreement without selecting another one', async ({ page }) => {
  await createDeadline(page, 'inclusion_agreement_review', 'missing-agreement');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'E2E Evaluation' });
  await row.getByRole('button', { name: 'Verhandlungsakte öffnen' }).click();
  await expect(page.getByText('Die verknüpfte Verhandlungsakte ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.')).toBeVisible();
  await expect(page.getByLabel('Verhandlungsakte', { exact: true })).toHaveValue('');
});
