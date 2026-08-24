import { test, expect } from './support/isolatedTest';

test('zeigt eine fehlgeschlagene Klartextbereinigung ehrlich an und führt zur Datenschutzprüfung', async ({ page }) => {
  await page.goto('/?auth=locked-cleanup-warning');
  await page.getByLabel('App-Passwort').fill('korrekt-pferd-batterie');
  await page.getByRole('button', { name: 'Entsperren', exact: true }).click();

  const warning = page.getByRole('alert').filter({ hasText: /automatische Klartextbereinigung/i });
  await expect(warning).toContainText(/Originaldatei blieb unverändert/i);
  await warning.getByRole('button', { name: 'Datenschutzprüfung öffnen' }).click();
  await expect(page.getByRole('heading', { name: 'Datenschutzprüfung & Löschung', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Lösch- und Datenschutzprüfung' })).toBeVisible();
});
