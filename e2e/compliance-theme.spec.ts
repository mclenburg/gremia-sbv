import { test, expect } from './support/test';

function parseRgb(value: string): number[] {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

test('keeps the compliance status area dark in dark mode', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Compliance/ }).click();

  const panel = page.locator('.compliance-status-panel').first();
  await expect(panel).toBeVisible();
  await expect(page.getByText(/Technischer Datenschutz|Technischer Status|Technischer Datenschutz- und Integritätsstatus/i)).toBeVisible();

  const background = await panel.evaluate((element) => getComputedStyle(element).backgroundColor);
  const [r, g, b] = parseRgb(background);
  expect(r + g + b).toBeLessThan(420);
});

test('keeps compliance light mode light without dark fallback panels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Einstellungen/ }).click();
  const lightOption = page.getByLabel(/hell|light/i).first();
  await lightOption.check().catch(async () => {
    await page.getByRole('button', { name: /Hell|Light/i }).click();
  });

  await page.getByRole('button', { name: /Compliance/ }).click();
  const panel = page.locator('.compliance-status-panel').first();
  await expect(panel).toBeVisible();

  const background = await panel.evaluate((element) => getComputedStyle(element).backgroundColor);
  const [r, g, b] = parseRgb(background);
  expect(r + g + b).toBeGreaterThan(520);
});
