import { expect, test } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('konfiguriert die optionale Gremia.BR-Kooperationsbrücke ohne automatische Synchronisation', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: /Einstellungen/i }).click();

  await page.getByRole('tab', { name: /Gremia\.BR/i }).click();
  const panel = page.getByRole('tabpanel', { name: /Gremia\.BR/i });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/keine laufende Hintergrundsynchronisation/i);
  await expect(panel).toContainText(/kein Rückschreiben/i);
  await expect(panel.getByLabel('API-Modus')).toHaveCount(0);
  const startupRefresh = panel.getByRole('checkbox', { name: /beim Programmstart automatisch aktualisieren/i });
  await expect(startupRefresh).not.toBeChecked();

  await panel.getByLabel(/Gremia\.BR-Anbindung aktivieren/i).check();
  await panel.getByLabel(/Serveradresse/i).fill('https://br.example.local');
  await panel.getByLabel(/Benutzerkonto/i).fill('sbv@example.local');
  await panel.getByLabel(/Passwort/i).fill('streng-geheim');
  await startupRefresh.check();

  await panel.getByRole('button', { name: /Einstellungen speichern/i }).click();
  await expect(panel.getByRole('status')).toContainText(/gespeichert/i);
  await expect(startupRefresh).toBeChecked();
  await expect(panel).not.toContainText('streng-geheim');
});

test('führt den ausdrücklich aktivierten Startabruf nach Neustart einmal aus', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: /Einstellungen/i }).click();
  await page.getByRole('tab', { name: /Gremia\.BR/i }).click();
  const panel = page.getByRole('tabpanel', { name: /Gremia\.BR/i });
  await panel.getByLabel(/Gremia\.BR-Anbindung aktivieren/i).check();
  await panel.getByLabel(/Serveradresse/i).fill('https://br.example.local');
  await panel.getByLabel(/Benutzerkonto/i).fill('sbv@example.local');
  await panel.getByLabel(/Passwort/i).fill('streng-geheim');
  await panel.getByRole('checkbox', { name: /beim Programmstart automatisch aktualisieren/i }).check();
  await panel.getByRole('button', { name: /Einstellungen speichern/i }).click();

  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'Gremia.BR wurde nach dem Programmstart aktualisiert.' })).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_STARTUP_REFRESHES: () => number }).__GREMIA_BR_STARTUP_REFRESHES())).toBe(1);
});

test('legt einen Remote-Fall erst nach Vorschau und ausdrücklicher Bestätigung an', async ({ page }) => {
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
  await page.getByRole('tab', { name: 'Verfahren', exact: true }).click();

  const panel = page.getByRole('region', { name: 'Gremia.BR-Fallanlage' });
  await panel.getByLabel('Lokale Fallakte').fill('TEST-0001 · Testperson Alpha');
  await panel.getByLabel('Sachverhalt für Gremia.BR').fill('Arbeitsplatzanpassung');
  await panel.getByRole('button', { name: 'SBV-Verfahrensarten abrufen' }).click();
  await panel.getByLabel('SBV-Verfahrensart').fill('SBV-Beteiligung');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_CASE_CREATIONS: () => number }).__GREMIA_BR_CASE_CREATIONS())).toBe(0);
  await panel.getByRole('button', { name: 'Übertragung prüfen' }).click();
  await expect(panel).toContainText('Arbeitsplatzanpassung');
  await expect(panel).toContainText('Weitere Fallakteninhalte oder Dokumente werden nicht übertragen.');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_CASE_CREATIONS: () => number }).__GREMIA_BR_CASE_CREATIONS())).toBe(0);
  await panel.getByRole('button', { name: 'Fall und Verfahren verbindlich anlegen' }).click();
  await expect(panel).toContainText('BR-2026-17');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_CASE_CREATIONS: () => number }).__GREMIA_BR_CASE_CREATIONS())).toBe(1);
});

test('ändert die Schutzklasse eigener Dokumente erst nach Vorschau', async ({ page }) => {
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
  await page.getByRole('tab', { name: 'Dokumente', exact: true }).click();

  const panel = page.getByRole('region', { name: 'Eigene Gremia.BR-Dokumentfreigaben' });
  await panel.getByLabel('Selbst übertragenes Dokument').fill('Eigene Stellungnahme');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_CLASSIFICATION_CHANGES: () => number }).__GREMIA_BR_CLASSIFICATION_CHANGES())).toBe(0);
  await panel.getByRole('button', { name: 'Klassifizierung abrufen' }).click();
  await expect(panel).toContainText('Aktuell: Hoch schutzbedürftig');
  await panel.getByLabel('Neue Schutzklasse').selectOption('CONFIDENTIAL');
  await panel.getByLabel('Grund für die Änderung').fill('Prüfung abgeschlossen');
  await panel.getByRole('button', { name: 'Änderung prüfen' }).click();
  await expect(panel).toContainText('Hoch schutzbedürftig → Vertraulich');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_CLASSIFICATION_CHANGES: () => number }).__GREMIA_BR_CLASSIFICATION_CHANGES())).toBe(0);
  await panel.getByRole('button', { name: 'Schutzklasse verbindlich ändern' }).click();
  await expect(panel).toContainText('Schutzklasse geändert');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_CLASSIFICATION_CHANGES: () => number }).__GREMIA_BR_CLASSIFICATION_CHANGES())).toBe(1);
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

test('lädt Sitzungsdaten nur bewusst und entfernt sie beim Refresh', async ({ page }) => {
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
  const overviewTab = page.getByRole('tab', { name: 'Übersicht', exact: true });
  await expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  await overviewTab.focus();
  await overviewTab.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Sitzungen', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_READ_REFRESHES: () => number }).__GREMIA_BR_READ_REFRESHES())).toBe(0);

  const meeting = page.getByRole('region', { name: 'Tagesordnung und Remote-Zugang' });
  await expect(meeting).toBeVisible();
  await expect(meeting).not.toContainText('PIN: 123456');
  await page.getByRole('button', { name: 'Gremia.BR aktualisieren' }).click();
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_READ_REFRESHES: () => number }).__GREMIA_BR_READ_REFRESHES())).toBe(1);
  await expect(meeting).toHaveCount(1);
  await meeting.getByLabel('Sitzung suchen und auswählen').fill('2026-05-29T09:00:00.000Z · BR-Sitzung Mai');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_MEETING_MINUTES_REQUESTS: () => number }).__GREMIA_BR_MEETING_MINUTES_REQUESTS())).toBe(0);
  await expect(meeting).not.toContainText('TOP 1: Arbeitsplatzausstattung');
  await meeting.getByRole('button', { name: 'Tagesordnung abrufen' }).click();
  await expect(meeting).toContainText('TOP 1: Arbeitsplatzausstattung');
  await expect(meeting).toContainText('Hinzugefügt: TOP 2: Mobiles Arbeiten');
  await expect(meeting).not.toContainText('PIN: 123456');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_REMOTE_ACCESS_REQUESTS: () => number }).__GREMIA_BR_REMOTE_ACCESS_REQUESTS())).toBe(0);

  await meeting.getByRole('button', { name: 'Remote-Zugang abrufen' }).click();
  await expect(meeting).toContainText('PIN: 123456');
  await meeting.getByRole('button', { name: 'Niederschrift prüfen' }).click();
  await expect(meeting).toContainText('Niederschrift vorhanden.');
  await expect(meeting).not.toContainText('Inhaltsprüfung');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_MEETING_MINUTES_REQUESTS: () => number }).__GREMIA_BR_MEETING_MINUTES_REQUESTS())).toBe(1);
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_REMOTE_ACCESS_REQUESTS: () => number }).__GREMIA_BR_REMOTE_ACCESS_REQUESTS())).toBe(1);
  await page.getByRole('button', { name: 'Gremia.BR aktualisieren' }).click();
  await expect(meeting).not.toContainText('PIN: 123456');
  await expect(meeting).not.toContainText('TOP 1: Arbeitsplatzausstattung');
  await expect(meeting).not.toContainText('Niederschrift vorhanden.');
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
  await page.getByRole('tab', { name: 'Dokumente', exact: true }).click();

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
  await expect(documents).toContainText('Signaturen der aktuellen Version');
  await expect(documents).toContainText('Geleistet');
  await expect(documents).toContainText('br-domain');
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_DOCUMENT_ACCESS_REQUESTS: () => number }).__GREMIA_BR_DOCUMENT_ACCESS_REQUESTS())).toBe(0);
  await documents.getByRole('button', { name: 'Zugriff beantragen' }).click();
  await expect(documents.getByRole('button', { name: 'Antrag stellen' })).toBeDisabled();
  await documents.getByLabel('Benötigter Zugriff').selectOption('MANAGE');
  await documents.getByLabel('Begründung für den Zugriff').fill('Für die Beratung erforderlich');
  await documents.getByRole('button', { name: 'Antrag stellen' }).click();
  await expect(documents.getByText(/wartet auf eine Entscheidung in Gremia\.BR/)).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_DOCUMENT_ACCESS_REQUESTS: () => number }).__GREMIA_BR_DOCUMENT_ACCESS_REQUESTS())).toBe(1);
  await documents.getByRole('button', { name: 'Version 1 öffnen' }).click();
  await expect(documents.getByText('Die Dokumentvorschau wurde angefordert.')).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __GREMIA_BR_DOCUMENT_SEARCHES: () => number }).__GREMIA_BR_DOCUMENT_SEARCHES())).toBe(1);
  await page.getByRole('button', { name: 'Gremia.BR aktualisieren' }).click();
  await expect(documents).not.toContainText('Für die BR-Beratung');
});
