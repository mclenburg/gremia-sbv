import { test, expect } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('creates a general violation without a case and progressively offers searchable measure context', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: 'Verstöße', exact: true }).click();

  await expect(page.getByRole('heading', { name: /Beteiligungsverstöße/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Verstoß erfassen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Beteiligungsverstoß erfassen' });
  const cancelButton = dialog.getByRole('button', { name: 'Abbrechen', exact: true });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Verstoß erfassen', exact: true })).toBeFocused();

  await page.getByRole('button', { name: 'Verstoß erfassen', exact: true }).click();
  await expect(dialog).toBeVisible();
  const sourceContext = dialog.getByLabel('Ausgangskontext', { exact: true });
  await expect(sourceContext).toHaveValue('general_employer_practice');
  await expect(dialog.getByLabel('Fallakte suchen und auswählen')).toHaveCount(0);
  await expect(dialog.getByLabel('SBV-Beteiligungsmaßnahme suchen und auswählen')).toHaveCount(0);

  await dialog.getByRole('button', { name: /Verstoß bewusst speichern/ }).click();
  await expect(
    page.locator('.industrial-message-warning').filter({ hasText: /Bitte die Pflichtfelder prüfen/ }),
  ).toBeVisible();
  await expect(page.locator('.industrial-live-region[role="alert"]').filter({ hasText: /Pflichtfelder/ })).toBeVisible();

  await dialog.getByLabel('Betreff').fill('E2E allgemeiner Beteiligungsverstoß ohne Fallbezug');
  await dialog.getByLabel('Maßnahme / Sachverhalt').fill('Allgemeine Arbeitszeitregelung ohne personenbezogenen Einzelfall.');
  await dialog.getByLabel('Was war falsch?').fill('Die SBV wurde vor der allgemeinen Anordnung nicht beteiligt.');
  await dialog.getByRole('button', { name: /Verstoß bewusst speichern/ }).click();

  await expect(page.locator('.industrial-live-region[role="status"]')).toContainText('Beteiligungsverstoß wurde protokolliert.');
  await expect(page.getByRole('table', { name: 'Beteiligungsverstöße' })).toContainText('E2E allgemeiner Beteiligungsverstoß ohne Fallbezug');

  await page.getByRole('button', { name: 'Verstoß erfassen', exact: true }).click();
  const secondDialog = page.getByRole('dialog', { name: 'Beteiligungsverstoß erfassen' });
  const secondSourceContext = secondDialog.getByLabel('Ausgangskontext', { exact: true });
  await secondSourceContext.selectOption('case_measure_participation');
  await expect(secondDialog.getByLabel('Fallakte suchen und auswählen')).toHaveCount(0);
  const measureSelection = secondDialog.getByLabel('SBV-Beteiligungsmaßnahme suchen und auswählen');
  await expect(measureSelection).toBeVisible();
  await measureSelection.fill('Arbeitszeitregelung');
  const resultListId = await measureSelection.getAttribute('list');
  expect(resultListId).toBeTruthy();
  await expect(page.locator(`#${resultListId} option`)).toHaveCount(1);
  await measureSelection.fill('Beteiligung zur allgemeinen Arbeitszeitregelung · TEST-0001');
  await measureSelection.blur();
  await expect(measureSelection).toHaveValue('Beteiligung zur allgemeinen Arbeitszeitregelung · TEST-0001');

  await secondSourceContext.selectOption('general_employer_practice');
  await expect(measureSelection).toHaveCount(0);
});

test('uses the full tracking width and requests an external PDF preview', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: 'Verstöße', exact: true }).click();

  const trackingPanel = page
    .getByRole('heading', { name: 'Protokollierte Beteiligungsverstöße' })
    .locator('xpath=ancestor::section[1]');
  await expect(page.getByRole('table', { name: 'Beteiligungsverstöße' })).toBeVisible();
  await expect(async () => {
    const box = await trackingPanel.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(700);
  }).toPass();

  const row = page.getByRole('row', { name: /E2E Beteiligungsverstoß aus Maßnahme/ });
  await row.getByRole('button', { name: 'PDF erzeugen', exact: true }).click();
  await expect(page.locator('.industrial-live-region[role="status"]')).toContainText('an die externe Vorschau übergeben');
  await expect(page.locator('.industrial-message-ok')).toContainText('beteiligungsverstoss-e2e.pdf');
});

test('opens a case-related violation deadline at its violation record', async ({ page }) => {
  await page.evaluate(async () => {
    await window.gremiaSbv.deadlines.create({
      caseId: 'case-test-0001', processId: 'violation-e2e-0001',
      processType: 'sbv_participation_violation', deadlineType: 'follow_up',
      title: 'Nachholung der SBV-Beteiligung prüfen', dueAt: '2026-05-20T10:00:00.000Z',
      sourceEvent: 'sbv_participation_violation.follow_up', severity: 'important',
      calculationMode: 'workflow', isLegalDeadline: false,
    });
  });
  await mainNavigation(page).getByRole('button', { name: 'Verstöße', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'Nachholung der SBV-Beteiligung prüfen' });
  await row.getByRole('button', { name: 'Beteiligungsverstoß öffnen' }).click();
  const detail = page.getByRole('dialog', { name: 'E2E Beteiligungsverstoß aus Maßnahme' });
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('Unterrichtung unvollständig.');
  await expect(detail.getByRole('button', { name: 'PDF erzeugen' })).toBeVisible();
});

test('reports a missing linked violation instead of opening the case overview', async ({ page }) => {
  await page.evaluate(async () => {
    await window.gremiaSbv.deadlines.create({
      caseId: 'case-test-0001', processId: 'missing-violation',
      processType: 'sbv_participation_violation', deadlineType: 'follow_up',
      title: 'Fehlenden Verstoß nachhalten', dueAt: '2026-05-20T10:00:00.000Z',
      sourceEvent: 'sbv_participation_violation.follow_up', severity: 'important',
      calculationMode: 'workflow', isLegalDeadline: false,
    });
  });
  await mainNavigation(page).getByRole('button', { name: 'Verstöße', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'Fehlenden Verstoß nachhalten' });
  await row.getByRole('button', { name: 'Beteiligungsverstoß öffnen' }).click();
  await expect(page.getByText('Der verknüpfte Beteiligungsverstoß ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'E2E Beteiligungsverstoß aus Maßnahme' })).toHaveCount(0);
});
