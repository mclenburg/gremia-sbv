import { test, expect } from './support/test';

test('opens and closes the keyboard command help with Ctrl+H and Esc', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+H' : 'Control+H');

  const dialog = page.getByRole('dialog', { name: /Kurzbefehle/ });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel(/Kurzbefehle durchsuchen/)).toBeFocused();

  await page.getByLabel(/Kurzbefehle durchsuchen/).fill('Beteiligung');
  await expect(dialog.getByText('/bet')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
