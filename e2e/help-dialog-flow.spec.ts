import { test, expect } from './support/test';
import { VISUAL_QA_ROUTES } from '../src/app/shared/theme/visualQa';
import type { Page } from '@playwright/test';

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openRoute(page: Page, navName: string) {
  await mainNavigation(page).getByRole('button', { name: navName, exact: true }).click();
}

const HELP_DIALOG_ROUTES = [
  { id: 'recruiting_participations', expectedTitle: /Wozu dient diese Arbeitsmaske\?/i },
  { id: 'participation_violations', expectedTitle: /Ausgangskontext des Verstoßes/i },
  { id: 'activity_journal', expectedTitle: /Eigenaufzeichnung der SBV|Tätigkeit erfassen|Kurzbefehle/i },
] as const;

test.describe('0.9.5-k Hilfe-on-demand Dialoge', () => {
  for (const helpRoute of HELP_DIALOG_ROUTES) {
    test(`öffnet und schließt Hilfe-Dialog tastaturstabil für ${helpRoute.id}`, async ({ page }) => {
      const route = VISUAL_QA_ROUTES.find((candidate) => candidate.id === helpRoute.id);
      if (!route) throw new Error(`VISUAL_QA_ROUTE fehlt: ${helpRoute.id}`);

      await page.goto('/');
      await expect(mainNavigation(page)).toBeVisible();
      await openRoute(page, route.navName);
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();

      const helpButton = page.locator('[data-e2e="industrial-help-button"]').first();
      await expect(helpButton).toBeVisible();
      await helpButton.focus();
      await expect(helpButton).toBeFocused();
      await page.keyboard.press('Enter');

      const dialog = page.getByRole('dialog', { name: helpRoute.expectedTitle });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(dialog.getByRole('button', { name: 'Schließen', exact: true })).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(helpButton).toBeFocused();
    });
  }

  test('lässt sichtbare Eskalationswarnungen trotz Hilfe-on-demand sichtbar', async ({ page }) => {
    const route = VISUAL_QA_ROUTES.find((candidate) => candidate.id === 'participation_violations');
    if (!route) throw new Error('VISUAL_QA_ROUTE fehlt: participation_violations');

    await page.goto('/');
    await openRoute(page, route.navName);
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();

    await page.getByLabel('Eskalationsstufe').selectOption('abmahnung');
    await expect(page.getByText(/anwaltlich|gewerkschaftlich|Abstimmung/i).first()).toBeVisible();
  });
});
