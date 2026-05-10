import { test, expect } from './support/test';

test('exports deadline iCal with process_type as default privacy level', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-deadlines"]').click();

  await expect(page.locator('[data-e2e="deadline-ical-export-panel"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fristen datensparsam exportieren' })).toBeVisible();
  await expect(page.locator('[data-e2e="deadline-ical-privacy-level"]')).toHaveValue('process_type');
  await expect(page.getByText(/Standard ist process_type/)).toBeVisible();

  await page.locator('[data-e2e="export-deadlines-ical"]').click();
  const calls = await page.evaluate(() => (window as any).__GREMIA_SBV_E2E_ICAL_EXPORTS);
  expect(calls).toHaveLength(1);
  expect(calls[0].privacyLevel).toBe('process_type');
  expect(calls[0].filters).toEqual({ status: ['open', 'overdue'] });
  expect(calls[0].ics).toContain('SUMMARY:Gremia.SBV: BEM-Wiedervorlage');
});

test('exports dashboard and privacy_first scopes without leaving the deadlines module', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-deadlines"]').click();
  await page.locator('[data-e2e="deadline-ical-privacy-level"]').selectOption('privacy_first');
  await page.locator('[data-e2e="deadline-ical-scope"]').selectOption('dashboard');
  await page.locator('[data-e2e="export-deadlines-ical"]').click();

  const calls = await page.evaluate(() => (window as any).__GREMIA_SBV_E2E_ICAL_EXPORTS);
  expect(calls.at(-1).privacyLevel).toBe('privacy_first');
  expect(calls.at(-1).filters).toEqual({ status: ['open', 'overdue'], dashboardOnly: true });
  expect(calls.at(-1).ics).toContain('SUMMARY:Gremia.SBV Wiedervorlage');
});
