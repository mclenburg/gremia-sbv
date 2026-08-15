import { test, expect } from './support/test';

test('opens and closes the keyboard command help with Ctrl+H and Esc', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Fallakte', exact: true });
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+H' : 'Control+H');

  const dialog = page.getByRole('dialog', { name: /Kurzbefehle/ });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel(/Kurzbefehle durchsuchen/)).toBeFocused();

  await page.getByLabel(/Kurzbefehle durchsuchen/).fill('Beteiligung');
  await expect(dialog.getByText('/bet', { exact: true })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
