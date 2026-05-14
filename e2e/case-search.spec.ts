import { test, expect } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openCaseWorkbench(page: import('@playwright/test').Page) {
  await page.goto('/');
  await mainNavigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await expect(page.getByRole('heading', { name: /TEST-0001\s*·\s*Testperson Alpha/ })).toBeVisible();
}

async function runCaseSearch(page: import('@playwright/test').Page, query: string) {
  await page.getByLabel('Volltextsuche in der Fallakte').fill(query);
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
}

test('findet Fallnotizen über Alle Inhalte und hebt Treffer sicher hervor', async ({ page }) => {
  await openCaseWorkbench(page);

  await page.getByRole('group', { name: 'Suchbereich einschränken' }).getByRole('button', { name: 'Alle Inhalte', exact: true }).click();
  await runCaseSearch(page, 'BEM-Aktenbezug');

  await expect(page.locator('.case-search-status')).toContainText('Ein Suchtreffer gefunden.');
  const result = page.getByRole('button', { name: /Fallnotiz .* TEST-0001 .* Synthetische Notiz mit Aktenbezug/i });
  await expect(result).toBeVisible();
  await expect(result.locator('mark')).toHaveText('BEM-Aktenbezug');

  const latestCall = await page.evaluate(() => (window as any).__GREMIA_SBV_E2E_SEARCH_CALLS.at(-1));
  expect(latestCall).toMatchObject({ query: 'BEM-Aktenbezug', caseId: 'case-test-0001' });
  expect(latestCall.sourceTypes).toBeUndefined();
});

test('wendet Suchbereichsfilter an und sucht nur im gewählten Quelltyp', async ({ page }) => {
  await openCaseWorkbench(page);

  await page.getByRole('group', { name: 'Suchbereich einschränken' }).getByLabel('BEM').check();
  await runCaseSearch(page, 'BEM-Anlass');

  await expect(page.locator('.case-search-status')).toContainText('Ein Suchtreffer gefunden.');
  await expect(page.getByRole('button', { name: /BEM .* TEST-0001 .* BEM-Testvorgang Alpha/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fallnotiz .* Synthetische Notiz/i })).toHaveCount(0);

  const latestCall = await page.evaluate(() => (window as any).__GREMIA_SBV_E2E_SEARCH_CALLS.at(-1));
  expect(latestCall.sourceTypes).toEqual(['bem']);
});

test('respektiert Fallaktenisolation und findet andere Fallakten erst bei globaler Suche', async ({ page }) => {
  await openCaseWorkbench(page);

  await runCaseSearch(page, 'BEM-Anlass Beta');
  await expect(page.locator('.case-search-status')).toContainText('0 Suchtreffer gefunden.');
  await expect(page.getByRole('button', { name: /BEM-Testvorgang Beta/i })).toHaveCount(0);

  await page.getByLabel('nur diese Fallakte').uncheck();
  await runCaseSearch(page, 'BEM-Anlass Beta');

  await expect(page.locator('.case-search-status')).toContainText('Ein Suchtreffer gefunden.');
  await expect(page.getByRole('button', { name: /BEM .* TEST-0002 .* BEM-Testvorgang Beta/i })).toBeVisible();

  const latestCall = await page.evaluate(() => (window as any).__GREMIA_SBV_E2E_SEARCH_CALLS.at(-1));
  expect(latestCall.caseId).toBeUndefined();
});

test('findet OCR-Texte als eigene Quelle ohne echten OCR-Prozess', async ({ page }) => {
  await openCaseWorkbench(page);

  await page.getByRole('group', { name: 'Suchbereich einschränken' }).getByLabel('OCR-Texte').check();
  await runCaseSearch(page, 'ScanFund');

  await expect(page.locator('.case-search-status')).toContainText('Ein Suchtreffer gefunden.');
  const result = page.getByRole('button', { name: /OCR-Text .* TEST-0001 .* OCR-Text .* Scan mit OCR/i });
  await expect(result).toBeVisible();
  await expect(result.locator('mark')).toHaveText('ScanFund');
});
