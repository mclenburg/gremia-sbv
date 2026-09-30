import { expect, test } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('konfiguriert die optionale Gremia.BR-Kooperationsbrücke ohne automatische Synchronisation', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: /Einstellungen/i }).click();

  await page.getByRole('tab', { name: /Gremia\.BR/i }).click();
  const panel = page.getByRole('tabpanel', { name: /Gremia\.BR/i });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/keine Hintergrundsynchronisation/i);
  await expect(panel).toContainText(/kein Rückschreiben/i);
  await expect(panel.getByLabel('API-Modus')).toHaveCount(0);

  await panel.getByLabel(/Gremia\.BR-Anbindung aktivieren/i).check();
  await panel.getByLabel(/Serveradresse/i).fill('https://br.example.local');
  await panel.getByLabel(/Benutzerkonto/i).fill('sbv@example.local');
  await panel.getByLabel(/Passwort/i).fill('streng-geheim');

  await panel.getByRole('button', { name: /Einstellungen speichern/i }).click();
  await expect(panel.getByRole('status')).toContainText(/gespeichert/i);
  await expect(panel).not.toContainText('streng-geheim');
});

test('zeigt Gremia.BR-Dashboarddaten nur bei aktivierter Kooperationsbrücke und lädt Detaildaten nur nach Nutzeraktion', async ({ page }) => {

  await expect(page.getByLabel('Gremia.BR-Kooperationsbrücke')).toHaveCount(0);
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
  const enabledCard = page.getByLabel('Gremia.BR-Kooperationsbrücke');
  await expect(enabledCard).toBeVisible();
  await expect(enabledCard).toContainText(/Letzter Datenabruf/i);
  await expect(enabledCard).toContainText(/noch nicht abgerufen|\d{2}\.\d{2}\.\d{4}/i);

  await enabledCard.getByRole('button', { name: /Abrufen/i }).click();

  await expect(page.getByRole('region', { name: /Nächste BR-Sitzung mit Agenda/i })).toBeVisible();
});

test('zeigt Remote-Zugang erst nach bewusster Sitzungsaktion und entfernt ihn beim Refresh', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: /Einstellungen/i }).click();
  await page.getByRole('tab', { name: /Gremia\.BR/i }).click();
  const settings = page.getByRole('tabpanel', { name: /Gremia\.BR/i });
  await settings.getByLabel(/Gremia\.BR-Anbindung aktivieren/i).check();
  await settings.getByLabel(/Serveradresse/i).fill('https://br.example.local');
  await settings.getByLabel(/Benutzerkonto/i).fill('sbv@example.local');
  await settings.getByLabel(/Passwort/i).fill('streng-geheim');
  await settings.getByRole('button', { name: 'SBV-Gremien aus Gremia.BR laden' }).click();
  await settings.getByRole('list', { name: 'Berechtigte SBV-Gremien aus Gremia.BR' }).getByRole('button', { name: 'Auswählen' }).click();
  await settings.getByRole('button', { name: /Einstellungen speichern/i }).click();
  await mainNavigation(page).getByRole('button', { name: 'Gremia.BR', exact: true }).click();

  const meeting = page.getByRole('region', { name: 'Tagesordnung und Remote-Zugang' });
  await expect(meeting).toBeVisible();
  await expect(meeting).not.toContainText('PIN: 123456');
  await page.getByRole('button', { name: 'Gremia.BR aktualisieren' }).click();
  await expect(meeting).toHaveCount(1);
  await meeting.getByLabel('Sitzung suchen und auswählen').fill('2026-05-29T09:00:00.000Z · BR-Sitzung Mai');
  await expect(meeting).not.toContainText('TOP 1: Arbeitsplatzausstattung');
  await meeting.getByRole('button', { name: 'Tagesordnung abrufen' }).click();
  await expect(meeting).toContainText('TOP 1: Arbeitsplatzausstattung');
  await expect(meeting).toContainText('Hinzugefügt: TOP 2: Mobiles Arbeiten');
  await expect(meeting).not.toContainText('PIN: 123456');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_REMOTE_ACCESS_REQUESTS: () => number }).__GREMIA_BR_REMOTE_ACCESS_REQUESTS())).toBe(0);

  await meeting.getByRole('button', { name: 'Remote-Zugang abrufen' }).click();
  await expect(meeting).toContainText('PIN: 123456');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_REMOTE_ACCESS_REQUESTS: () => number }).__GREMIA_BR_REMOTE_ACCESS_REQUESTS())).toBe(1);
  await page.getByRole('button', { name: 'Gremia.BR aktualisieren' }).click();
  await expect(meeting).not.toContainText('PIN: 123456');
  await expect(meeting).not.toContainText('TOP 1: Arbeitsplatzausstattung');
});

test('sucht Remote-Dokumente bewusst und zeigt Metadaten erst nach Detailaktion', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: /Einstellungen/i }).click();
  await page.getByRole('tab', { name: /Gremia\.BR/i }).click();
  const settings = page.getByRole('tabpanel', { name: /Gremia\.BR/i });
  await settings.getByLabel(/Gremia\.BR-Anbindung aktivieren/i).check();
  await settings.getByLabel(/Serveradresse/i).fill('https://br.example.local');
  await settings.getByLabel(/Benutzerkonto/i).fill('sbv@example.local');
  await settings.getByLabel(/Passwort/i).fill('streng-geheim');
  await settings.getByRole('button', { name: 'SBV-Gremien aus Gremia.BR laden' }).click();
  await settings.getByRole('list', { name: 'Berechtigte SBV-Gremien aus Gremia.BR' }).getByRole('button', { name: 'Auswählen' }).click();
  await settings.getByRole('button', { name: /Einstellungen speichern/i }).click();
  await mainNavigation(page).getByRole('button', { name: 'Gremia.BR', exact: true }).click();

  const documents = page.getByRole('region', { name: 'Gremia.BR-Dokumente' });
  await expect(documents).not.toContainText('Stellungnahme');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_DOCUMENT_SEARCHES: () => number }).__GREMIA_BR_DOCUMENT_SEARCHES())).toBe(0);
  await documents.getByLabel('Dokument suchen').fill('Stellungnahme');
  await documents.getByRole('button', { name: 'Suche starten' }).click();
  await documents.getByLabel('Gefundenes Dokument auswählen').fill('Stellungnahme');
  await expect(documents).not.toContainText('Für die BR-Beratung');
  await documents.getByRole('button', { name: 'Details abrufen' }).click();
  await expect(documents).toContainText('Für die BR-Beratung');
  await expect(documents).toContainText('Hoch schutzbedürftig');
  await expect(documents).toContainText('br-domain');
  await documents.getByRole('button', { name: 'Version 1 öffnen' }).click();
  await expect(documents.getByText('Die Dokumentvorschau wurde angefordert.')).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_DOCUMENT_SEARCHES: () => number }).__GREMIA_BR_DOCUMENT_SEARCHES())).toBe(1);
  await page.getByRole('button', { name: 'Gremia.BR aktualisieren' }).click();
  await expect(documents).not.toContainText('Für die BR-Beratung');
});
