import { test, expect } from './support/test';

interface IcalExportDebugCall {
  privacyLevel?: string;
  filters?: Record<string, unknown>;
  ics?: string;
}

type IcalExportDebugWindow = Window & {
  __GREMIA_SBV_E2E_ICAL_EXPORTS: IcalExportDebugCall[];
};

function deadlineIcalExportCalls() {
  return (window as IcalExportDebugWindow).__GREMIA_SBV_E2E_ICAL_EXPORTS;
}

test('exports deadline iCal with process_type as default privacy level', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-deadlines"]').click();

  await page.locator('[data-e2e="open-deadline-ical-export"]').click();
  const exportDialog = page.getByRole('dialog', { name: /Kalenderdatei exportieren/ });
  await expect(exportDialog.locator('[data-e2e="deadline-ical-export-panel"]')).toBeVisible();
  await expect(exportDialog.getByRole('heading', { name: 'Kalenderdatei exportieren' })).toBeVisible();
  await expect(exportDialog.locator('[data-e2e="deadline-ical-privacy-level"]')).toHaveValue('process_type');
  await expect(exportDialog.locator('[data-e2e="deadline-ical-privacy-summary"]')).toContainText('Vorgangstyp · Standard');

  await exportDialog.locator('[data-e2e="export-deadlines-ical"]').click();
  const calls = await page.evaluate(deadlineIcalExportCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0].privacyLevel).toBe('process_type');
  expect(calls[0].filters).toEqual({ status: ['open', 'overdue'] });
  expect(calls[0].ics).toContain('SUMMARY:Gremia.SBV: BEM-Wiedervorlage');
});

test('exports dashboard and privacy_first scopes without leaving the deadlines module', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-deadlines"]').click();
  await page.locator('[data-e2e="open-deadline-ical-export"]').click();
  const exportDialog = page.getByRole('dialog', { name: /Kalenderdatei exportieren/ });
  await exportDialog.locator('[data-e2e="deadline-ical-privacy-level"]').selectOption('privacy_first');
  await exportDialog.locator('[data-e2e="deadline-ical-scope"]').selectOption('dashboard');
  await exportDialog.locator('[data-e2e="export-deadlines-ical"]').click();

  const calls = await page.evaluate(deadlineIcalExportCalls);
  expect(calls.at(-1).privacyLevel).toBe('privacy_first');
  expect(calls.at(-1).filters).toEqual({ status: ['open', 'overdue'], dashboardOnly: true });
  expect(calls.at(-1).ics).toContain('SUMMARY:Gremia.SBV Wiedervorlage');
});
