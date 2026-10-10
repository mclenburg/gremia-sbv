import { test, expect } from './support/test';

type SearchCall = { query?: string; area?: string; currentCaseId?: string; sourceTypes?: string[] };

function navigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openCase(page: import('@playwright/test').Page) {
  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Diese Fallakte durchsuchen' })).toBeVisible();
}

async function openGlobalSearch(page: import('@playwright/test').Page) {
  await navigation(page).getByRole('button', { name: 'Suche', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Suche', level: 1 })).toBeVisible();
}

async function searchInCase(page: import('@playwright/test').Page, query: string) {
  await page.getByRole('textbox', { name: 'Diese Fallakte durchsuchen' }).fill(query);
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
}

async function searchGlobally(page: import('@playwright/test').Page, query: string, area: string) {
  await page.getByRole('radio', { name: area }).check();
  await page.getByRole('textbox', { name: 'Volltextsuche' }).fill(query);
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
}

function hit(page: import('@playwright/test').Page, value: string) {
  return page.getByLabel('Suchtreffer').getByRole('button').filter({ hasText: value });
}

async function lastSearchCall(page: import('@playwright/test').Page): Promise<SearchCall> {
  return page.evaluate(() => (window as Window & { __GREMIA_SBV_E2E_SEARCH_CALLS: SearchCall[] }).__GREMIA_SBV_E2E_SEARCH_CALLS.at(-1) ?? {});
}

test('zeigt Fallnotiz mit hervorgehobener Fundstelle und öffnet sie per Tastatur', async ({ page }) => {
  await openCase(page);
  await searchInCase(page, 'BEM-Aktenbezug');
  const result = hit(page, 'Synthetische Notiz mit Aktenbezug');
  await expect(result).toContainText('Fallakten · Fallnotiz · Fallakte TEST-0001');
  await expect(result.locator('mark')).toHaveText('BEM-Aktenbezug');
  await result.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.case-detail-content').getByRole('heading', { name: 'Synthetische Notiz mit Aktenbezug' })).toBeVisible();
  expect(await lastSearchCall(page)).toMatchObject({ query: 'BEM-Aktenbezug', area: 'current_case', currentCaseId: 'case-test-0001' });
});

test('filtert Quelltypen und wechselt mit einem Treffer genau zum anderen Fallprozess', async ({ page }) => {
  await openGlobalSearch(page);
  await page.getByRole('group', { name: 'Inhaltstypen einschränken' }).getByLabel('BEM').check();
  await searchGlobally(page, 'BEM-Anlass Beta', 'Alle Fallakten');
  const result = hit(page, 'BEM-Testvorgang Beta');
  await expect(result).toContainText('Fallakte TEST-0002');
  await result.click();
  await expect(page.locator('.case-tree-panel').getByRole('heading', { name: 'TEST-0002' })).toBeVisible();
  await expect(page.locator('.case-detail-content')).toContainText('BEM-Anlass Beta');
  expect((await lastSearchCall(page)).sourceTypes).toEqual(['bem']);
});

test('trennt Fallakten vom gesamten Datenbestand', async ({ page }) => {
  await openCase(page);
  await searchInCase(page, 'BEM-Anlass Beta');
  await expect(hit(page, 'BEM-Testvorgang Beta')).toHaveCount(0);
  await openGlobalSearch(page);
  await searchGlobally(page, 'BEM-Anlass Beta', 'Gesamter Datenbestand');
  await expect(hit(page, 'BEM-Testvorgang Beta')).toBeVisible();
  expect((await lastSearchCall(page)).area).toBe('all_data');
});

test('findet indizierten OCR-Text ohne Onlinefunktion', async ({ page }) => {
  await openCase(page);
  await page.getByRole('group', { name: 'Inhaltstypen einschränken' }).getByLabel('Dokumente').check();
  await searchInCase(page, 'ScanFund');
  const result = hit(page, 'Scan mit OCR');
  await expect(result).toContainText('Dokument · Fallakte TEST-0001 · OCR-Text');
  await expect(result.locator('mark')).toHaveText('ScanFund');
});

test('öffnet einen Treffer der Wissensbasis direkt am passenden Datensatz', async ({ page }) => {
  await openGlobalSearch(page);
  await searchGlobally(page, 'Zentrale Beteiligungs', 'Gesamter Datenbestand');
  await hit(page, 'Aufgaben der Schwerbehindertenvertretung').click();
  await expect(page.getByRole('heading', { name: 'Wissensdatenbank' })).toBeVisible();
  await expect(page.locator('.knowledge-layout')).toContainText('Aufgaben der Schwerbehindertenvertretung');
});

test('zeigt bei Quellen ohne eigene Datensatzansicht den vollständigen indizierten Inhalt', async ({ page }) => {
  await openGlobalSearch(page);
  await searchGlobally(page, 'BudgetStichwort', 'Gesamter Datenbestand');
  await hit(page, 'SBV-Ressource').click();
  await expect(page.locator('.case-detail-content')).toContainText('Vollständiger synthetischer Ressourceninhalt mit BudgetStichwort und weiteren Angaben.');
});
