import { test, expect } from './support/isolatedTest';

test('bearbeitet Arbeitsplatzgestaltung mit Prüfpunkten, Förderbetrag und erhaltenen Terminen', async ({ page }) => {
  await page.addInitScript(() => {
    const timestamp = new Date().toISOString();
    const process = {
      id: 'synthetic-workplace', caseId: 'case-test-0001', title: 'Synthetische Arbeitsplatzgestaltung',
      status: 'arbeitgeber_lehnt_ab', category: 'technische_arbeitshilfe', riskLevel: 'erhoeht',
      requestedAdjustment: 'Synthetische Arbeitshilfe', legalBasis: '§ 164 Abs. 4 SGB IX',
      technicalAidNeeded: false, organizationalAdjustmentNeeded: false, workingTimeAdjustmentNeeded: false,
      qualificationNeeded: false, fixedWorkplaceNeeded: false, homeofficeOrMobileWorkRelevant: false,
      inclusionOfficeInvolved: false, rehabCarrierInvolved: false,
      employerResponseStatus: 'abgelehnt', implementationStatus: 'nicht_begonnen',
      createdAt: timestamp, updatedAt: timestamp,
    };
    window.gremiaSbv!.workplaceAccommodation.list = async () => [{ ...process }];
    window.gremiaSbv!.workplaceAccommodation.update = async (_id, input) => {
      Object.assign(process, input);
      return { ...process };
    };
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.locator('.case-tree-node').filter({ hasText: /^Arbeitsplatzgestaltung/u }).click();
  await expect(page.getByRole('heading', { name: 'Synthetische Arbeitsplatzgestaltung', exact: true })).toBeVisible();
  await expect(page.getByText(/Ablehnung dokumentiert\. Einschaltung des Inklusionsamts/)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Inklusionsamt einbezogen', exact: true }).check();
  await expect(page.getByText(/Ablehnung dokumentiert\. Einschaltung des Inklusionsamts/)).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'technische Arbeitshilfe', exact: true }).check();
  const due = page.getByRole('textbox', { name: 'Umsetzung bis', exact: true });
  await due.fill('2031-04-12T09:30');
  await due.press('Tab');
  const funding = page.getByRole('textbox', { name: 'Förderbetrag optional', exact: true });
  await funding.fill('850,50');
  await funding.press('Tab');
  await expect.poll(() => page.evaluate(async () => (await window.gremiaSbv!.workplaceAccommodation.list())[0].fundingAmount)).toBe(850.5);
  await funding.fill('kein Betrag');
  await funding.press('Tab');
  expect(await page.evaluate(async () => (await window.gremiaSbv!.workplaceAccommodation.list())[0].fundingAmount)).toBe(850.5);
  const requested = page.getByRole('textbox', { name: 'Gewünschte Gestaltung / Nachteilsausgleich', exact: true });
  await requested.fill('Synthetische barrierearme Software');
  await requested.press('Tab');
  await expect.poll(() => page.evaluate(async () => (await window.gremiaSbv!.workplaceAccommodation.list())[0].requestedAdjustment)).toBe('Synthetische barrierearme Software');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.locator('.case-tree-node').filter({ hasText: /^Arbeitsplatzgestaltung/u }).click();
  await expect(page.getByRole('checkbox', { name: 'technische Arbeitshilfe', exact: true })).toBeChecked();
  await expect(due).toHaveValue('2031-04-12T09:30');
  await expect(funding).toHaveValue('850.5');
  await expect(requested).toHaveValue('Synthetische barrierearme Software');
});
