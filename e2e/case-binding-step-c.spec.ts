import { test, expect } from './support/test';

function navigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('legt Fallakte aus Person heraus personengebunden an', async ({ page }) => {
  await page.goto('/');
  await navigation(page).getByRole('button', { name: 'Personen', exact: true }).click();
  await page.getByText('Mustermann, Max').click();
  await page.getByRole('button', { name: 'Fallakte aus Person anlegen' }).click();
  await expect(page.getByRole('dialog', { name: 'Fallakte aus Person anlegen' })).toBeVisible();
  await page.getByLabel('Fallakte aus Person anlegen').getByLabel('Aktenzeichen').fill('TEST-PERSON-01');
  await page.getByLabel('Fallakte aus Person anlegen').getByRole('button', { name: 'Fallakte aus Person anlegen' }).click();
  await expect(page.locator('#main-content').getByText('Fallakte wurde aus der Person heraus angelegt.')).toBeVisible();

  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await expect(page.locator('[data-e2e="case-row-TEST-PERSON-01"]')).toBeVisible();
});

test('verhindert freie Fallakte und erlaubt den anonymen Sonderweg', async ({ page }) => {
  await page.goto('/');
  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('.case-register-actions').getByRole('button', { name: 'Fallakte', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Neue Fallakte anlegen' });
  await dialog.getByLabel('Aktenzeichen').fill('TEST-ANON-01');
  await dialog.getByRole('button', { name: 'Person auswählen →' }).click();
  await expect(dialog.getByRole('alert')).toContainText(/Person auswählen|anonyme Beratungsanfrage/i);

  await dialog.locator('[data-e2e="anonymous-request-path"]').click();
  await expect(page.locator('[data-e2e="case-row-TEST-ANON-01"]')).toBeVisible();
});

test('zeigt Altfall-Hinweis und öffnet Legacy-Zuordnungsdialog barrierearm', async ({ page }) => {
  await page.goto('/');
  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0002"]').click();
  await expect(page.locator('[data-e2e="legacy-case-hint"]')).toBeVisible();
  await page.getByRole('button', { name: 'Legacy-Zuordnung prüfen' }).click();

  const dialog = page.locator('[data-e2e="legacy-case-binding-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Altfall einer Person zuordnen' })).toBeVisible();
  await expect(dialog.getByLabel('Person')).toBeFocused();
  await dialog.getByLabel('Person').selectOption('person-test-0001');
  await dialog.getByLabel('Prüfgrund').fill('Manuelle Aktenprüfung im Legacy-Zuordnungsdialog.');
  await dialog.getByRole('button', { name: 'Zuordnung speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-e2e="legacy-case-hint"]')).toBeHidden();
});

test('schließt Legacy-Zuordnungsdialog per Escape', async ({ page }) => {
  await page.goto('/');
  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0002"]').click();
  await page.getByRole('button', { name: 'Legacy-Zuordnung prüfen' }).click();
  await expect(page.locator('[data-e2e="legacy-case-binding-dialog"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-e2e="legacy-case-binding-dialog"]')).toBeHidden();
});
