import { test, expect } from './support/test';

test('opens a manual case deadline at its own record instead of the case overview', async ({ page }) => {
  await page.evaluate(async () => {
    await window.gremiaSbv.deadlines.create({
      caseId: 'case-test-0001', processType: 'case', deadlineType: 'follow_up',
      title: 'E2E fallbezogene manuelle Frist', dueAt: '2026-05-20T10:00:00.000Z',
      severity: 'important', calculationMode: 'manual', isLegalDeadline: false,
      description: 'Konkrete Wiedervorlage ohne Maßnahmenbezug',
    });
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'E2E fallbezogene manuelle Frist' });
  await row.getByRole('button', { name: 'Frist öffnen' }).click();
  const dialog = page.getByRole('dialog', { name: 'E2E fallbezogene manuelle Frist' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Notiz')).toHaveValue('Konkrete Wiedervorlage ohne Maßnahmenbezug');
});
