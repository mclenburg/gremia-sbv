import { test, expect } from './support/test';

test('opens persons module and shows status expiry workflow without horizontal overflow', async ({ page }) => {
  await page.locator('[data-e2e="main-nav-persons"]').click();

  await expect(page.getByRole('heading', { name: 'Personenverzeichnis' }).first()).toBeVisible();
  await expect(page.locator('[data-e2e="persons-workbench"]')).toBeVisible();
  const toolbarButtons = page.locator('.person-toolbar button');
  await expect(toolbarButtons.nth(0)).toHaveText(/Personen importieren/);
  await expect(toolbarButtons.nth(1)).toHaveText(/Fristen exportieren/);
  await expect(page.locator('[data-e2e="open-person-create-dialog"]')).toHaveClass(/industrial-button/);
  await expect(page.locator('[data-e2e="open-person-import-wizard"]')).toHaveClass(/industrial-secondary-button/);
  await expect(page.getByRole('button', { name: /Ablauf prüfen/ })).toBeVisible();
  await expect(page.getByText('Mustermann, Max')).toBeVisible();
  await expect(page.locator('.person-lifecycle-badge').first()).toBeVisible();
  await page.getByText('Mustermann, Max').click();
  await expect(page.locator('.person-detail [data-e2e="create-case-from-selected-person"]')).toBeVisible();
  await expect(page.locator('.person-detail [data-e2e="open-person-anonymize-dialog"]')).toBeVisible();
  await expect(page.locator('.person-toolbar [data-e2e="create-case-from-selected-person"]')).toHaveCount(0);
  await expect(page.locator('.person-toolbar [data-e2e="open-person-anonymize-dialog"]')).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('öffnet die Person aus ihrer Statusfrist und entfernt die Warnung nach Datumsänderung', async ({ page }) => {
  const dateAfter = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  await page.locator('[data-e2e="main-nav-persons"]').click();
  await page.locator('[data-e2e="open-person-create-dialog"]').click();
  const createDialog = page.locator('[data-e2e="person-create-dialog"]');
  await createDialog.getByLabel('Vorname').fill('Nora');
  await createDialog.getByLabel('Nachname').fill('Fristprobe');
  await createDialog.getByLabel('Status gültig bis').fill(dateAfter(2));
  await createDialog.getByRole('button', { name: 'Person anlegen' }).click();
  await page.getByRole('button', { name: /Ablauf prüfen/ }).click();
  await expect(page.locator('.person-expiry-card [role="status"]')).toBeVisible();

  const target = await page.evaluate(async () => {
    const person = (await window.gremiaSbv.persons.list()).find((item) => item.lastName === 'Fristprobe');
    const deadlines = await window.gremiaSbv.deadlines.list();
    const index = deadlines.findIndex((item) => item.processId === person?.id && item.sourceEvent === 'protected_person.status_expiry_warning');
    return { personId: person?.id, index, deadlineId: deadlines[index]?.id };
  });
  expect(target.personId).toBeTruthy();
  expect(target.index).toBeGreaterThanOrEqual(0);
  await page.locator('[data-e2e="main-nav-deadlines"]').click();
  await page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').nth(target.index).getByRole('button', { name: 'Person öffnen' }).click();
  await expect(page.locator('#person-detail-heading')).toHaveText('Fristprobe, Nora');
  await expect(page.locator('#person-detail-heading')).toBeFocused();

  await page.getByRole('button', { name: 'Person bearbeiten: Fristprobe, Nora' }).click();
  const editDialog = page.locator('[data-e2e="person-edit-dialog"]');
  await editDialog.getByLabel('Status gültig bis').fill(dateAfter(90));
  await editDialog.getByRole('button', { name: 'Person speichern' }).click();
  await expect(page.locator('.person-detail')).toContainText(dateAfter(90));
  const status = await page.evaluate(async (id) => (await window.gremiaSbv.deadlines.list()).find((item) => item.id === id)?.status, target.deadlineId);
  expect(status).toBe('cancelled');
});

test('guides CSV import through preview, mapping and validation', async ({ page }) => {
  await page.locator('[data-e2e="main-nav-persons"]').click();

  await page.locator('[data-e2e="open-person-import-wizard"]').click();
  const dialog = page.locator('[data-e2e="person-import-wizard"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Personen importieren' })).toBeVisible();
  await dialog.getByText('Erweiterte Option: CSV direkt einfügen').click();
  await dialog.getByLabel('CSV-Daten').fill('Name;Status;Gültig bis\nImportperson, Ida;gleichgestellt;15.06.2026');
  await dialog.getByRole('button', { name: 'CSV-Vorschau erzeugen' }).click();

  await expect(dialog.getByRole('heading', { name: 'Vorschau aus eingefuegte-arbeitgeberliste.csv' })).toBeVisible();
  await expect(dialog.getByText('Importperson, Ida')).toBeVisible();
  await expect(dialog.getByText(/Zeichenkodierung: utf-8/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Weiter zum Spaltenmapping' }).click();

  await expect(dialog.getByRole('heading', { name: 'Spaltenmapping' })).toBeVisible();
  await expect(dialog.locator('[data-e2e="person-import-field-fullName"]')).toHaveValue('Name');
  await expect(dialog.locator('[data-e2e="person-import-field-fullName"]')).toHaveClass(/industrial-select/);
  await expect(dialog.locator('[data-e2e="person-import-field-personnelNumber"]')).toHaveValue('');
  await dialog.getByRole('button', { name: 'Mapping prüfen' }).click();

  await expect(dialog.getByRole('heading', { name: 'Importprüfung' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(dialog.getByRole('heading', { name: 'Import abgeschlossen' })).toBeVisible();
  await expect(dialog.locator('[data-e2e="person-import-close-result"]')).toHaveClass(/industrial-secondary-button/);
  await dialog.locator('[data-e2e="person-import-close-result"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Importperson, Ida')).toBeVisible();
});

test('legt Personen manuell ausschließlich im Modal-Overlay an und zeigt Auswahl rechts', async ({ page }) => {
  await page.locator('[data-e2e="main-nav-persons"]').click();

  await page.getByText('Mustermann, Max').click();
  await expect(page.locator('.person-detail')).toContainText('Mustermann, Max');
  await expect(page.locator('.person-detail')).toContainText('Verknüpfte Fallakten:');
  await expect(page.locator('.person-side-stack form[aria-labelledby="person-create-heading"]')).toHaveCount(0);

  await page.locator('[data-e2e="open-person-create-dialog"]').click();
  const dialog = page.locator('[data-e2e="person-create-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Person anlegen' })).toBeVisible();
  await dialog.getByLabel('Vorname').fill('Mara');
  await dialog.getByLabel('Nachname').fill('Modal');
  await dialog.getByRole('button', { name: 'Person anlegen' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Modal, Mara')).toBeVisible();
});


test('bearbeitet importierte oder manuell angelegte Personen im Modal', async ({ page }) => {
  await page.locator('[data-e2e="main-nav-persons"]').click();
  await page.getByText('Mustermann, Max').click();
  await page.getByRole('button', { name: /Person bearbeiten: Mustermann, Max/ }).click();

  const dialog = page.locator('[data-e2e="person-edit-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Person bearbeiten' })).toBeVisible();
  await dialog.getByLabel('Organisationseinheit').fill('SBV-Testteam ÄÖÜ');
  await dialog.getByLabel('Standort').fill('Rostock');
  await dialog.getByLabel('Dienstliche E-Mail').fill('max.mustermann@example.test');
  await dialog.getByRole('button', { name: 'Person speichern' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('.person-detail')).toContainText('SBV-Testteam ÄÖÜ');
  await expect(page.locator('.person-detail')).toContainText('Rostock');
});

test('führt Personenanonymisierung über geschützten Modalpfad aus', async ({ page }) => {
  await page.locator('[data-e2e="main-nav-persons"]').click();
  await page.getByText('Mustermann, Max').click();
  await page.locator('[data-e2e="open-person-anonymize-dialog"]').click();

  const dialog = page.locator('[data-e2e="person-anonymize-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Person anonymisieren' })).toBeVisible();
  await dialog.getByLabel('Grund').fill('Status dauerhaft entfallen, weitere personenbezogene Speicherung nicht erforderlich.');
  await dialog.getByLabel('Bestätigung').fill('PERSON ANONYMISIEREN');
  await dialog.getByRole('button', { name: 'Person anonymisieren' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('#main-content').getByText('Person wurde anonymisiert. Verbundene Fallakten benötigen Datenschutzprüfung.')).toBeVisible();
});

test('führt Personenlöschung über geschützten Modalpfad aus', async ({ page }) => {
  await page.locator('[data-e2e="main-nav-persons"]').click();
  await page.getByText('Mustermann, Max').click();
  await page.getByRole('button', { name: /Person löschen: Mustermann, Max/ }).click();

  const dialog = page.locator('[data-e2e="person-delete-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Person löschen' })).toBeVisible();
  await dialog.getByLabel('Grund').fill('Löschgrund nach abgeschlossener Prüfung dokumentiert.');
  await dialog.getByLabel('Bestätigung').fill('PERSON LÖSCHEN');
  await dialog.getByRole('button', { name: 'Person löschen' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('#main-content').getByText('Person wurde gelöscht. Verbundene Fallakten benötigen Datenschutzprüfung.')).toBeVisible();
  await expect(page.getByText('Mustermann, Max')).toHaveCount(0);
});
