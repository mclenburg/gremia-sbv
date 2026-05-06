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
