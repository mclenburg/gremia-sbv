import { test, expect } from './support/test';

test('öffnet vom Dashboard die vollständige manuelle Datenschutzprüfung', async ({ page }) => {
  await page.goto('/');
  const dashboardCard = page.getByRole('button', { name: /Lösch- und Datenschutzprüfung/u });
  await expect(dashboardCard).toContainText('2 manuelle Prüfaufträge');
  await dashboardCard.click();

  const cockpit = page.locator('[data-e2e="privacy-review-cockpit"]');
  await expect(cockpit.getByRole('heading', { name: 'Lösch- und Datenschutzprüfung' })).toBeVisible();
  await expect(cockpit.getByRole('row', { name: /Abgeschlossene Fallakte prüfen/u })).toBeVisible();
  await expect(cockpit.getByRole('row', { name: /Erledigte Frist prüfen/u })).toBeVisible();
  await expect(cockpit).toContainText('jede Löschung bleiben ausdrücklich manuell');

  await cockpit.getByLabel('Risiko filtern').selectOption('critical');
  await expect(cockpit.getByRole('row', { name: /Abgeschlossene Fallakte prüfen/u })).toBeVisible();
  await expect(cockpit.getByRole('row', { name: /Erledigte Frist prüfen/u })).toHaveCount(0);
});
