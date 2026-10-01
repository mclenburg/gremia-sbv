import { test, expect } from './support/test';

test('opens an employer obligation deadline at the selected review', async ({ page }) => {
  await page.evaluate(async () => {
    await window.gremiaSbv.sbvOffice.obligations.ensureAnnual(2025);
    await window.gremiaSbv.deadlines.create({
      processId: 'obligation-2025', processType: 'employer_obligation_review', deadlineType: 'follow_up',
      title: 'Arbeitgeberpflicht 2025 prüfen', dueAt: '2026-05-20T10:00:00.000Z',
      severity: 'important', calculationMode: 'workflow', isLegalDeadline: false,
    });
  });
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'Arbeitgeberpflicht 2025 prüfen' });
  await row.getByRole('button', { name: 'Prüfvorgang öffnen' }).click();

  await expect(page.getByRole('heading', { name: 'Prüfvorgang bearbeiten' })).toBeVisible();
  await expect(page.getByLabel('Prüfvorgang', { exact: true })).toHaveValue('obligation-2025');
  await expect(page.getByRole('heading', { name: 'Prüfvorgang bearbeiten' })).toBeFocused();
  await expect(page.getByLabel('Feststellung')).toBeVisible();
});

test('reports a missing linked review without selecting another one', async ({ page }) => {
  await page.evaluate(async () => {
    await window.gremiaSbv.sbvOffice.obligations.ensureAnnual(2025);
    await window.gremiaSbv.deadlines.create({
      processId: 'missing-obligation', processType: 'employer_obligation_review', deadlineType: 'follow_up',
      title: 'Fehlende Arbeitgeberprüfung', dueAt: '2026-05-20T10:00:00.000Z',
      severity: 'important', calculationMode: 'workflow', isLegalDeadline: false,
    });
  });
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'Fehlende Arbeitgeberprüfung' });
  await row.getByRole('button', { name: 'Prüfvorgang öffnen' }).click();

  await expect(page.getByText('Der verknüpfte Prüfvorgang ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.')).toBeVisible();
  await expect(page.getByLabel('Prüfvorgang', { exact: true })).toHaveValue('');
});
