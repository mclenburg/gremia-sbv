import { test, expect } from './support/isolatedTest';

test('zeigt erreichte Präventionsabschnitte an und speichert Änderungen erst beim Verlassen des Textfelds', async ({ page }) => {
  await page.addInitScript(() => {
    const timestamp = new Date().toISOString();
    const process = {
      id: 'synthetic-prevention', caseId: 'case-test-0001', status: 'zu_pruefen',
      difficultyType: 'organisatorisch', riskType: 'ueberlastung', personStatus: 'gleichgestellt',
      hazardDescription: 'Synthetischer Präventionsanlass', contactIds: [], createdAt: timestamp, updatedAt: timestamp,
    };
    window.gremiaSbv!.prevention.list = async () => [{ ...process }];
    window.gremiaSbv!.prevention.update = async (_id, input) => {
      Object.assign(process, input);
      return { ...process };
    };
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.locator('.case-tree-node').filter({ hasText: /^Prävention/u }).click();
  await expect(page.getByRole('heading', { name: 'Präventionsverfahren', exact: true })).toBeVisible();
  const status = page.getByRole('combobox', { name: 'Status', exact: true });
  await expect(page.getByLabel('Arbeitgeber angefordert am', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Maßnahmen', exact: true })).toHaveCount(0);
  await status.fill('angefordert');
  await status.press('Enter');
  const requested = page.getByLabel('Arbeitgeber angefordert am', { exact: true });
  await expect(requested).toBeVisible();
  await requested.fill('2031-04-12T09:30');
  await requested.press('Tab');
  await expect(requested).toHaveValue('2031-04-12T09:30');
  await status.fill('blockiert');
  await status.press('Enter');
  const measures = page.getByRole('textbox', { name: 'Maßnahmen', exact: true });
  await expect(measures).toBeVisible();
  await expect(page.getByLabel('Arbeitgeberreaktion / Stand', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Ergebnis / Abschluss', { exact: true })).toBeVisible();
  await measures.fill('Synthetische Maßnahme');
  expect(await page.evaluate(async () => (await window.gremiaSbv!.prevention.list())[0].measures)).toBeUndefined();
  await expect(page.getByRole('heading', { name: '4. Maßnahmenklärung und Umsetzung', exact: true })).toBeVisible();
  await measures.press('Tab');
  await expect.poll(() => page.evaluate(async () => (await window.gremiaSbv!.prevention.list())[0].measures)).toBe('Synthetische Maßnahme');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.locator('.case-tree-node').filter({ hasText: /^Prävention/u }).click();
  await expect(page.getByRole('textbox', { name: 'Maßnahmen', exact: true })).toHaveValue('Synthetische Maßnahme');
  await expect(page.getByLabel('Arbeitgeber angefordert am', { exact: true })).toHaveValue('2031-04-12T09:30');
});
