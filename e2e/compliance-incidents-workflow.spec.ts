import { test, expect } from './support/isolatedTest';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const rows: Array<Record<string, unknown>> = [];
    const service = window.gremiaSbv!.compliance;
    service.listIncidents = async () => rows.map((row) => ({ ...row }));
    service.selfCheck = async () => ({ generatedAt: new Date().toISOString(), score: 100, status: 'ok', items: [], nextActions: [] });
    service.createIncident = async (input) => {
      const timestamp = new Date().toISOString();
      const row = { ...input, id: `synthetic-incident-${rows.length + 1}`, status: 'open', authorityNotificationChecked: false, createdAt: timestamp, updatedAt: timestamp };
      rows.push(row);
      return row;
    };
    service.updateIncident = async (id, input) => {
      const row = rows.find((record) => record.id === id)!;
      Object.assign(row, input);
      return row;
    };
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Compliance', exact: true }).click();
  await page.getByRole('navigation', { name: 'Compliance-Arbeitsbereiche', exact: true }).getByRole('button', { name: /Datenschutzvorfälle/ }).click();
});

test('behält den Entwurf nach Speicherfehler und erlaubt Suche und Abschluss nach bestätigtem Speichern', async ({ page }) => {
  const region = page.getByLabel('Datenschutzvorfälle und Sicherheitsereignisse', { exact: true });
  const summary = region.getByRole('textbox', { name: 'Kurzbeschreibung', exact: true });
  const save = region.getByRole('button', { name: 'Vorfall speichern', exact: true });
  await expect(save).toBeDisabled();
  await expect(region.getByRole('status').filter({ hasText: 'Keine Datenschutzvorfälle' })).toContainText('Keine Datenschutzvorfälle dokumentiert.');
  await summary.fill('   ');
  await expect(save).toBeDisabled();
  await summary.fill('Synthetischer Vorfall');
  await region.getByLabel('Betroffene Datenkategorien', { exact: true }).fill('Synthetische Fallnotizen');
  await region.getByLabel('Sofortmaßnahmen', { exact: true }).fill('Versand gestoppt');
  const category = region.getByRole('combobox', { name: 'Art', exact: true });
  await category.fill('Falscher Empfänger');
  await category.press('Enter');
  await region.getByLabel('Risiko', { exact: true }).selectOption('high');
  await page.evaluate(() => {
    const original = window.gremiaSbv!.compliance.createIncident;
    let failNext = true;
    window.gremiaSbv!.compliance.createIncident = async (input) => {
      if (failNext) { failNext = false; throw new Error('Synthetischer Speicherfehler'); }
      return original(input);
    };
  });
  await save.focus();
  await save.press('Enter');
  await expect(page.locator('.industrial-live-region[role="alert"]')).toHaveText('Synthetischer Speicherfehler');
  await expect(summary).toHaveValue('Synthetischer Vorfall');
  await expect(region.getByLabel('Betroffene Datenkategorien', { exact: true })).toHaveValue('Synthetische Fallnotizen');
  await expect(region.getByLabel('Sofortmaßnahmen', { exact: true })).toHaveValue('Versand gestoppt');
  await expect(category).toHaveValue('Falscher Empfänger');
  await expect(region.getByLabel('Risiko', { exact: true })).toHaveValue('high');
  await expect(save).toBeEnabled();
  await save.press('Enter');
  const record = region.getByLabel('Datenschutzvorfall Synthetischer Vorfall', { exact: true });
  await expect(record).toBeVisible();
  await expect(summary).toHaveValue('');
  await expect(region.getByLabel('Sofortmaßnahmen', { exact: true })).toHaveValue('');
  await expect(save).toBeDisabled();
  const search = region.getByRole('searchbox', { name: 'Vorfallliste durchsuchen', exact: true });
  await search.fill('VERSAND GESTOPPT');
  await expect(record).toBeVisible();
  await search.fill('kein passender vorfall');
  await expect(record).toHaveCount(0);
  await expect(region.getByRole('status').filter({ hasText: 'Keine Treffer' })).toContainText('Zur Suche passen keine Datenschutzvorfälle.');
  await search.fill('');
  await record.getByLabel('Meldung an Aufsicht geprüft', { exact: true }).check();
  await expect(record.getByLabel('Meldung an Aufsicht geprüft', { exact: true })).toBeChecked();
  await record.getByLabel('Status', { exact: true }).selectOption('closed');
  await expect(record.getByLabel('Status', { exact: true })).toHaveValue('closed');
  await expect(record.getByLabel('Status abgeschlossen', { exact: true })).toBeVisible();
});

test('verhindert mehrfaches Speichern und erhält währenddessen ergänzte Eingaben', async ({ page }) => {
  const region = page.getByLabel('Datenschutzvorfälle und Sicherheitsereignisse', { exact: true });
  const summary = region.getByRole('textbox', { name: 'Kurzbeschreibung', exact: true });
  const save = region.getByRole('button', { name: 'Vorfall speichern', exact: true });
  await page.evaluate(() => {
    const original = window.gremiaSbv!.compliance.createIncident;
    window.gremiaSbv!.compliance.createIncident = async (input) => {
      await new Promise<void>((resolve) => { window.addEventListener('synthetic-incident-save-release', () => resolve(), { once: true }); });
      return original(input);
    };
  });
  await summary.fill('Ausstehender Vorfall');
  await save.click();
  await expect(save).toBeDisabled();
  await expect(summary).toHaveValue('Ausstehender Vorfall');
  await summary.fill('Weiterbearbeiteter Entwurf');
  await page.evaluate(() => window.dispatchEvent(new Event('synthetic-incident-save-release')));
  await expect(region.getByLabel('Datenschutzvorfall Ausstehender Vorfall', { exact: true })).toBeVisible();
  await expect(summary).toHaveValue('Weiterbearbeiteter Entwurf');
  await expect(save).toBeEnabled();
});
