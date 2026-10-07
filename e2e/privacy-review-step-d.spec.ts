import { test, expect } from './support/test';
import type { Page } from '@playwright/test';

async function anonymizationCalls(page: Page) {
  return page.evaluate(() => (window as Window & { __PRIVACY_REVIEW_ANONYMIZATIONS?: unknown[] }).__PRIVACY_REVIEW_ANONYMIZATIONS ?? []);
}

function navigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('öffnet Datenschutz-Prüfdialog mit Kontext und dokumentiert Fortspeicherung', async ({ page }) => {
  await navigation(page).getByRole('button', { name: 'Personen', exact: true }).click();
  await page.getByText('Mustermann, Max').click();
  await page.locator('[data-e2e="open-privacy-review-dialog"]').click();

  const dialog = page.getByRole('dialog', { name: 'Prüfung bei Zweckfortfall' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Personenstatus')).toBeVisible();
  await expect(dialog.getByText('Offene Fristen')).toBeVisible();
  await expect(dialog.getByText('Laufende Maßnahmen')).toBeVisible();
  await expect(dialog.getByText('Freitextprüfung')).toBeVisible();

  const action = dialog.getByRole('combobox', { name: 'Aktion', exact: true });
  await action.fill('Fortspeicherung');
  await action.press('Enter');
  await expect(action).toHaveValue('Fortspeicherung begründen');
  await dialog.getByLabel('Grund / Prüfbemerkung').fill('Laufendes Beteiligungsverfahren, erneute Prüfung erforderlich.');
  await dialog.getByLabel('Erneut prüfen am').fill('2026-07-01');
  await dialog.getByRole('button', { name: 'Aktion dokumentieren' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#main-content').getByText('Fortspeicherung wurde dokumentiert.')).toBeVisible();
});

test('markiert abgeschlossene Altakten per Bulk-Aktion zur Datenschutzprüfung', async ({ page }) => {
  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await expect(page.locator('[data-e2e="case-row-TEST-0003"]')).toBeVisible();
  await page.locator('[data-e2e="bulk-mark-closed-legacy"]').click();
  await expect(page.locator('#main-content').getByText('1 abgeschlossene Altakten wurden zur Datenschutzprüfung vorgemerkt.')).toBeVisible();
});

for (const scenario of [
  {
    option: 'anonymize_marked',
    expectedMode: 'marked_free_text',
    search: 'nur vorgemerkte',
    optionName: 'Fallakte anonymisieren · nur vorgemerkte Freitexte',
    expectedMessage: 'Fallakte wurde anonymisiert (nur vorgemerkte Freitexte).',
    warning: 'Nicht vorgemerkte personenbezogene Angaben in Freitexten bleiben erhalten und müssen anschließend manuell geprüft werden.'
  },
  {
    option: 'anonymize_all',
    expectedMode: 'replace_all_free_text',
    search: 'alle Freitexte',
    optionName: 'Fallakte anonymisieren · alle Freitexte ersetzen',
    expectedMessage: 'Fallakte wurde anonymisiert (alle Freitexte ersetzt).'
  }
] as const) {
  test(`überträgt den Fallanonymisierungsmodus ${scenario.option} bis zum Bridge-Aufruf`, async ({ page }) => {
    await page.evaluate(() => {
      const testWindow = window as Window & { __PRIVACY_REVIEW_ANONYMIZATIONS: unknown[] };
      testWindow.__PRIVACY_REVIEW_ANONYMIZATIONS = [];
      const service = window.gremiaSbv!.privacyReview;
      const original = service.anonymizeCase.bind(service);
      service.anonymizeCase = async (input) => {
        testWindow.__PRIVACY_REVIEW_ANONYMIZATIONS.push({ ...input });
        return original(input);
      };
    });
    await navigation(page).getByRole('button', { name: 'Personen', exact: true }).click();
    await page.getByText('Mustermann, Max').click();
    await page.locator('[data-e2e="open-privacy-review-dialog"]').click();

    const dialog = page.getByRole('dialog', { name: 'Prüfung bei Zweckfortfall' });
    const action = dialog.getByRole('combobox', { name: 'Aktion', exact: true });
    await action.fill(scenario.search);
    await expect(dialog.getByRole('option', { name: scenario.optionName, exact: true })).toBeVisible();
    await action.press('Enter');
    await expect(action).toHaveValue(scenario.optionName);
    await expect(action).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog.getByLabel('Bestätigung')).toHaveValue('');
    await expect(dialog.locator('[data-e2e="audit-log-retention-notice"]')).toContainText('Sicherheitseinträge im Audit-Log bleiben aus Integritätsgründen erhalten');
    if ('warning' in scenario) await expect(dialog.getByText(scenario.warning)).toBeVisible();

    await dialog.getByLabel('Grund / Prüfbemerkung').fill('Anonymisierung im E2E-Vertrag.');
    expect(await anonymizationCalls(page)).toEqual([]);
    await dialog.getByLabel('Bestätigung').fill('FALL ANONYMISIEREN');
    await dialog.getByRole('button', { name: 'Aktion dokumentieren' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('#main-content').getByText(scenario.expectedMessage)).toBeVisible();
    expect(await anonymizationCalls(page)).toEqual([expect.objectContaining({
      caseId: 'case-test-0001',
      anonymizationMode: scenario.expectedMode,
      reason: 'Anonymisierung im E2E-Vertrag.',
      confirmation: 'FALL ANONYMISIEREN',
    })]);
  });
}
