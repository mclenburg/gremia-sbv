import { test, expect } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('creates a general violation without a case and progressively offers searchable measure context', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: 'Verstöße', exact: true }).click();

  await expect(page.getByRole('heading', { name: /Beteiligungsverstöße/i }).first()).toBeVisible();
  const sourceContext = page.getByLabel('Ausgangskontext', { exact: true });
  await expect(sourceContext).toHaveValue('general_employer_practice');
  await expect(page.getByLabel('Fallakte suchen und auswählen')).toHaveCount(0);
  await expect(page.getByLabel('SBV-Beteiligungsmaßnahme suchen und auswählen')).toHaveCount(0);

  await page.getByRole('button', { name: /Verstoß bewusst speichern/ }).click();
  await expect(
    page.locator('.industrial-message-warning').filter({ hasText: /Bitte die Pflichtfelder prüfen/ }),
  ).toBeVisible();
  await expect(page.locator('.industrial-live-region[role="alert"]').filter({ hasText: /Pflichtfelder/ })).toBeVisible();

  await page.getByLabel('Betreff').fill('E2E allgemeiner Beteiligungsverstoß ohne Fallbezug');
  await page.getByLabel('Maßnahme / Sachverhalt').fill('Allgemeine Arbeitszeitregelung ohne personenbezogenen Einzelfall.');
  await page.getByLabel('Was war falsch?').fill('Die SBV wurde vor der allgemeinen Anordnung nicht beteiligt.');
  await page.getByRole('button', { name: /Verstoß bewusst speichern/ }).click();

  await expect(page.locator('.industrial-live-region[role="status"]')).toContainText('Beteiligungsverstoß wurde protokolliert.');
  await expect(page.getByRole('table', { name: 'Beteiligungsverstöße' })).toContainText('E2E allgemeiner Beteiligungsverstoß ohne Fallbezug');

  await sourceContext.selectOption('case_measure_participation');
  await expect(page.getByLabel('Fallakte suchen und auswählen')).toHaveCount(0);
  const measureSelection = page.getByLabel('SBV-Beteiligungsmaßnahme suchen und auswählen');
  await expect(measureSelection).toBeVisible();
  await measureSelection.fill('Arbeitszeitregelung');
  await expect(page.getByText('1 Treffer verfügbar.')).toBeAttached();
  await measureSelection.fill('Beteiligung zur allgemeinen Arbeitszeitregelung · TEST-0001');
  await measureSelection.blur();
  await expect(measureSelection).toHaveValue('Beteiligung zur allgemeinen Arbeitszeitregelung · TEST-0001');

  await sourceContext.selectOption('general_employer_practice');
  await expect(measureSelection).toHaveCount(0);
});
