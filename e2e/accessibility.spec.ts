import { test, expect } from './support/test';

function shortcutForHelp() {
  return process.platform === 'darwin' ? 'Meta+H' : 'Control+H';
}

test('supports keyboard navigation through primary RC areas', async ({ page }) => {
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-e2e="case-row-TEST-0001"]')).toBeVisible();

  await navigation.getByRole('button', { name: 'Compliance', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Compliance|Technischer Datenschutzstatus/i }).first()).toBeVisible();
});

test('keeps inline help accessible by dialog role, focus and Escape', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press(shortcutForHelp());

  const dialog = page.locator('[data-e2e="inline-help-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Kurzbefehle/ })).toBeVisible();
  await expect(page.getByLabel(/Kurzbefehle durchsuchen/)).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('renders note entity links with fachliche accessible labels instead of UUIDs', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-cases"]').click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.getByRole('button', { name: /Synthetische Notiz mit Aktenbezug/ }).click();

  const link = page.locator('[data-e2e="note-entity-link"]').first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAccessibleName(/BEM-Testvorgang/);
  await expect(link).not.toHaveAccessibleName(/link-test|bem-test|case-test/);
});

test('supports keyboard-only person selection and case creation from selected person', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Personen', exact: true }).focus();
  await page.keyboard.press('Enter');

  await page.locator('.person-list-select').filter({ hasText: 'Mustermann, Max' }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Fallakte aus Person anlegen' })).toBeEnabled();
  await page.getByRole('button', { name: 'Fallakte aus Person anlegen' }).focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Fallakte aus Person anlegen' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Aktenzeichen')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Fallakte aus Person anlegen' })).toBeFocused();
});

test('supports keyboard-only anonymous request path and announces binding feedback', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.locator('.case-register-actions').getByRole('button', { name: 'Fallakte', exact: true }).focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Neue Fallakte anlegen' });
  await dialog.getByLabel('Aktenzeichen').fill('TEST-A11Y-ANON');
  await dialog.locator('[data-e2e="anonymous-request-path"]').focus();
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: 'Fall anlegen' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-e2e="case-row-TEST-A11Y-ANON"]')).toBeVisible();
  await expect(page.getByRole('status')).toContainText(/Anonyme Anfrage wurde angelegt|Fallakte wurde/);
});
