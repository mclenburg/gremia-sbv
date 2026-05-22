import { expect, test } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('konfiguriert die optionale Gremia.BR-Lesebrücke ohne automatische Synchronisation', async ({ page }) => {
  await page.goto('/');
  await mainNavigation(page).getByRole('button', { name: /Einstellungen/i }).click();

  await page.getByRole('tab', { name: /Gremia\.BR/i }).click();
  const panel = page.getByRole('tabpanel', { name: /Gremia\.BR/i });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/keine Hintergrundsynchronisation/i);
  await expect(panel).toContainText(/kein Rückschreiben/i);

  await panel.getByLabel(/Gremia\.BR-Anbindung aktivieren/i).check();
  await panel.getByLabel(/Serveradresse/i).fill('https://br.example.local');
  await panel.getByLabel(/Benutzerkonto/i).fill('sbv@example.local');
  await panel.getByLabel(/Passwort/i).fill('streng-geheim');

  await panel.getByRole('button', { name: /Einstellungen speichern/i }).click();
  await expect(panel.getByRole('status')).toContainText(/gespeichert/i);
  await expect(panel).not.toContainText('streng-geheim');
});

test('zeigt Gremia.BR-Dashboarddaten nur bei aktivierter Lesebrücke und lädt Detaildaten nur nach Nutzeraktion', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel('Gremia.BR-Lesebrücke')).toHaveCount(0);
  await expect(page.getByRole('region', { name: /Nächste BR-Sitzung mit Agenda/i })).toHaveCount(0);

  await mainNavigation(page).getByRole('button', { name: /Einstellungen/i }).click();
  await page.getByRole('tab', { name: /Gremia\.BR/i }).click();
  const settingsPanel = page.getByRole('tabpanel', { name: /Gremia\.BR/i });
  await settingsPanel.getByLabel(/Gremia\.BR-Anbindung aktivieren/i).check();
  await settingsPanel.getByLabel(/Serveradresse/i).fill('https://br.example.local');
  await settingsPanel.getByLabel(/Benutzerkonto/i).fill('sbv@example.local');
  await settingsPanel.getByLabel(/Passwort/i).fill('streng-geheim');
  await settingsPanel.getByRole('button', { name: /Einstellungen speichern/i }).click();

  await mainNavigation(page).getByRole('button', { name: /Dashboard/i }).click();
  const enabledCard = page.getByLabel('Gremia.BR-Lesebrücke');
  await expect(enabledCard).toBeVisible();
  await expect(enabledCard).toContainText(/Letzter Datenabruf/i);
  await expect(enabledCard).toContainText(/noch nicht abgerufen|\d{2}\.\d{2}\.\d{4}/i);

  await enabledCard.getByRole('button', { name: /Abrufen/i }).click();

  await expect(page.getByRole('region', { name: /Nächste BR-Sitzung mit Agenda/i })).toBeVisible();
});
