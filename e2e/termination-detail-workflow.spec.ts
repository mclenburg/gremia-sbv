import { test, expect } from './support/isolatedTest';

test('bestätigt Kündigungsfristen bewusst und erhält Schutzprüfung und Stellungnahme', async ({ page }) => {
  await page.addInitScript(() => {
    const process = {
      id: 'synthetic-termination', caseId: 'case-test-0001', status: 'eingang',
      terminationType: 'ordentlich', protectionStatus: 'unklar',
      receivedAt: '2031-05-01T08:00:00.000Z',
      createdAt: '2031-05-01T08:00:00.000Z', updatedAt: '2031-05-01T08:00:00.000Z',
    };
    window.gremiaSbv!.termination.list = async () => [{ ...process }];
    window.gremiaSbv!.termination.update = async (_id, input) => {
      Object.assign(process, input);
      return { ...process };
    };
    window.gremiaSbv!.termination.warnings = async () => [];
  });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.getByRole('button', { name: /^Kündigung Kündigungsanhörung ·/u }).click();
  const proposedDue = page.getByRole('button', { name: /^Frist vorschlagen:/u });
  await expect(proposedDue).toBeVisible();
  expect(await page.evaluate(async () => (await window.gremiaSbv!.termination.list())[0].sbvStatementDueAt)).toBeUndefined();
  expect(await page.evaluate(async () => (await window.gremiaSbv!.termination.list())[0].status)).toBe('eingang');
  await proposedDue.focus();
  await proposedDue.press('Enter');
  await expect.poll(() => page.evaluate(async () => (await window.gremiaSbv!.termination.list())[0].sbvStatementDueAt)).toBe('2031-05-08T08:00:00.000Z');
  await expect(proposedDue).toHaveCount(0);
  await page.getByRole('button', { name: /^Status vorschlagen:/u }).click();
  await expect.poll(() => page.evaluate(async () => (await window.gremiaSbv!.termination.list())[0].status)).toBe('unterlagen_pruefen');
  await page.getByRole('combobox', { name: 'Schutzstatus', exact: true }).selectOption('gleichgestellt');
  const due = page.getByRole('textbox', { name: 'SBV-Stellungnahmefrist', exact: true });
  await due.fill('2031-05-10T09:30');
  await due.press('Tab');
  const officeDate = page.getByRole('textbox', { name: 'Integrationsamt angefragt am', exact: true });
  await officeDate.fill('2031-05-02T11:00');
  await officeDate.press('Tab');
  const statement = page.getByRole('textbox', { name: 'SBV-Stellungnahme', exact: true });
  await statement.fill('Synthetische Stellungnahme zur Anhörung');
  expect(await page.evaluate(async () => (await window.gremiaSbv!.termination.list())[0].statement)).toBeUndefined();
  await statement.press('Tab');
  await expect.poll(() => page.evaluate(async () => (await window.gremiaSbv!.termination.list())[0].statement)).toBe('Synthetische Stellungnahme zur Anhörung');
  await navigation.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.getByRole('button', { name: /^Kündigung Kündigungsanhörung ·/u }).click();
  await expect(due).toHaveValue('2031-05-10T09:30');
  await expect(officeDate).toHaveValue('2031-05-02T11:00');
  await expect(statement).toHaveValue('Synthetische Stellungnahme zur Anhörung');
  await expect(page.getByRole('combobox', { name: 'Schutzstatus', exact: true })).toHaveValue('gleichgestellt');
  await expect(proposedDue).toHaveCount(0);
});
