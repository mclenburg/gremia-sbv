import { test, expect } from './support/isolatedTest';

test('wechselt Einstellungsbereiche mit zugeordneten, zugänglichen Panels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Einstellungen' }).click();

  const tablist = page.getByRole('tablist', { name: 'Einstellungsbereiche' });
  const tabs = tablist.getByRole('tab');
  await expect(tabs).toHaveCount(6);
  await expect(tabs.filter({ hasText: 'Allgemein' })).toHaveAttribute('aria-selected', 'true');

  for (const [label, heading] of [
    ['Sicherheit', 'Sicherheit'],
    ['Datenschutz', 'Datenschutz & Löschung'],
    ['Übergaben', 'Übergaben'],
    ['Vorlagen', 'Vorlagen-Standardwerte'],
  ] as const) {
    const tab = tabs.filter({ hasText: label });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    const panel = page.getByRole('tabpanel', { name: new RegExp(label) });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
});
