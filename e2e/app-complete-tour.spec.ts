import { test, expect } from './support/test';
import { VISUAL_QA_ROUTES } from '../src/app/shared/theme/visualQa';
import type { Page } from '@playwright/test';

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openRoute(page: Page, navName: string) {
  await mainNavigation(page).getByRole('button', { name: navName, exact: true }).click();
}

test('runs a complete synthetic 1.0 product tour across areas not covered by focused E2E flows', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();

  for (const route of VISUAL_QA_ROUTES) {
    await openRoute(page, route.navName);
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
    await expect(mainNavigation(page).getByRole('button', { name: route.navName, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('main')).toBeVisible();
  }

  await openRoute(page, 'Kontakte');
  await page.getByLabel('Vorname').fill('Ada');
  await page.getByLabel('Nachname').fill('E2E');
  await page.getByLabel('Firma / Stelle').fill('Inklusionsamt Test');
  await page.getByLabel('Rolle').fill('Fachberatung');
  await page.getByLabel('Kategorie').selectOption('inklusionsamt');
  await page.getByRole('button', { name: /Kontakt speichern/ }).click();
  await expect(page.getByText(/Kontakt angelegt/)).toBeVisible();
  await expect(page.getByLabel('Vorname')).toHaveValue('');
  await expect(page.getByLabel('Nachname')).toHaveValue('');
  await expect(page.getByRole('button', { name: /Ada E2E|E2E, Ada|Inklusionsamt Test/ }).first()).toBeVisible();

  await openRoute(page, 'Wissen');
  await page.getByPlaceholder(/Norm, Stichwort oder Praxisbegriff suchen/).fill('178');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('button', { name: /§ 178 SGB IX/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /§ 178 SGB IX/ }).first().click();
  await expect(page.getByRole('heading', { name: /§ 178 SGB IX/ }).first()).toBeVisible();
  await page.getByText('Mit Fallakte verknüpfen').click();
  await page.locator('.knowledge-case-link select').selectOption('case-test-0001');
  await page.getByRole('button', { name: /Rechtsbezug setzen/ }).click();
  const knowledgeRegion = page.getByLabel('Wissensdatenbank');
  const caseLinkFeedback = /Rechtsbezug § 178 SGB IX wurde mit der Fallakte verknüpft/;
  await expect(knowledgeRegion.locator('.industrial-message.industrial-message-ok').filter({ hasText: caseLinkFeedback })).toBeVisible();
  await expect(page.locator('.industrial-live-region[role="status"]').filter({ hasText: caseLinkFeedback })).toHaveText(caseLinkFeedback);

  await openRoute(page, 'Vorlagen');
  await page.getByLabel(/Hilfe zu Vorlagen und Platzhaltern öffnen/).click();
  const helpDialog = page.getByRole('dialog', { name: /Platzhalter|Vorlagen/i });
  await expect(helpDialog).toBeVisible();
  await helpDialog.getByRole('button', { name: 'Schließen' }).click();
  await expect(helpDialog).toBeHidden();
  await page.getByRole('button', { name: /Neue Vorlage/ }).click();
  const createTemplateDialog = page.getByRole('dialog', { name: /Vorlage ergänzen/ });
  await expect(createTemplateDialog).toBeVisible();
  await createTemplateDialog.getByLabel('Titel').fill('E2E Ergänzungsvorlage');
  await createTemplateDialog.getByLabel('Kategorie').selectOption('beteiligung');
  await createTemplateDialog.getByLabel('Betreff').fill('E2E Beteiligung');
  await createTemplateDialog.getByLabel('Text').fill('Synthetischer Vorlagentext ohne Echtdaten.');
  await createTemplateDialog.getByRole('button', { name: /Vorlage speichern/ }).click();
  const templatesRegion = page.getByLabel('Vorlagen', { exact: true });
  const templateFeedback = /Eigene Vorlage wurde gespeichert/;
  await expect(templatesRegion.locator('.industrial-message.industrial-message-ok').filter({ hasText: templateFeedback })).toBeVisible();
  await expect(page.locator('.industrial-live-region[role="status"]').filter({ hasText: templateFeedback })).toHaveText(templateFeedback);
  await expect(page.getByRole('button', { name: /E2E Ergänzungsvorlage/ }).first()).toBeVisible();

  await openRoute(page, 'Berichte');
  await expect(page.getByRole('region', { name: 'Berichtskatalog' }).or(page.locator('[aria-label="Berichtskatalog"]'))).toBeVisible();
  await page.getByRole('button', { name: /^PDF erzeugen$/ }).click();
  const reportsRegion = page.getByLabel('Berichte', { exact: true });
  const reportFeedback = /wurde als verschlüsselter PDF-Report erzeugt/;
  await expect(reportsRegion.locator('.industrial-message').filter({ hasText: reportFeedback })).toBeVisible();
  await expect(page.locator('.industrial-live-region[role="status"]').filter({ hasText: reportFeedback })).toBeVisible();
  await expect(reportsRegion.getByText('activity-e2e.pdf', { exact: true })).toBeVisible();

  await expect.poll(() => pageErrors, { message: 'keine ungefangenen Browserfehler im vollständigen Produkttour-E2E' }).toEqual([]);
  expect(consoleErrors.filter((entry) => !/Download the React DevTools/i.test(entry))).toEqual([]);
});
