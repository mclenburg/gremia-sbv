import { test, expect } from './support/test';
import type { Page } from '@playwright/test';

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openRecruiting(page: Page) {
  await page.goto('/');
  await mainNavigation(page).getByRole('button', { name: 'Stellenbesetzungen', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Stellenbesetzungen/i }).first()).toBeVisible();
}

test('tracks recruiting participation without case file and opens violation only as explicit prefill', async ({ page }) => {
  await openRecruiting(page);
  await page.getByRole('button', { name: 'Neue Stellenbesetzung', exact: true }).click();

  await page.getByLabel(/Stelle \/ Bezeichnung/).fill('E2E Fachadministration');
  await page.getByLabel('Kennziffer').fill('REC-095E');
  await page.getByLabel('Organisationseinheit').fill('IT-Service');
  await page.getByLabel('Unterrichtung erhalten').fill('2026-05-06');
  await page.getByLabel('Unterlagen erhalten').fill('2026-05-07');
  await page.getByLabel('Anhörung / Stellungnahme bis').fill('2026-05-14');
  await page.getByLabel('Zur Verstoßprüfung vormerken').check();
  await page.getByRole('button', { name: /Stellenbesetzung anlegen/ }).click();

  await expect(page.locator('.industrial-live-region[role="status"]').filter({ hasText: /Stellenbesetzung wurde angelegt/ })).toBeVisible();
  await expect(page.locator('.industrial-record-card').filter({ hasText: 'E2E Fachadministration' }).first()).toBeVisible();

  await page.getByLabel('Gesprächsdatum').fill('2026-05-08');
  await page.getByLabel('Bewerbungsreferenz').fill('Klarname Test darf nicht ins Journal');
  await page.getByLabel('Referenzmodus').selectOption('clear_name');
  await page.getByLabel('SBV teilgenommen').check();
  await page.getByRole('button', { name: /Gespräch erfassen/ }).click();

  await expect(page.locator('.industrial-live-region[role="status"]').filter({ hasText: /Vorstellungsgespräch wurde erfasst/ })).toBeVisible();
  await expect(page.getByText('Klarname Test darf nicht ins Journal')).toBeVisible();

  await page.getByLabel('Wiedervorlage am').fill('2026-05-15');
  await page.getByRole('button', { name: /Anhörung nachhalten/ }).click();
  await expect(page.locator('.industrial-live-region[role="status"]').filter({ hasText: /Wiedervorlage wurde angelegt/ })).toBeVisible();

  await page.getByRole('button', { name: 'Beteiligungsverstoß prüfen', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Beteiligungsverstöße/i }).first()).toBeVisible();
  await expect(page.getByLabel('Ausgangskontext')).toHaveValue('recruiting_participation');
  await expect(page.getByLabel('Betreff')).toHaveValue(/Beteiligungsverstoß Stellenbesetzung REC-095E/);
  await expect(page.getByText('Klarname Test darf nicht ins Journal')).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Beteiligungsverstöße' })).not.toContainText('REC-095E');
});

test('keeps applicant references out of recruiting interview journal prefill', async ({ page }) => {
  await openRecruiting(page);

  await page.locator('.industrial-record-card').filter({ hasText: 'E2E Systemadministration' }).first().click();
  await page.locator('article.industrial-record-card').filter({ hasText: 'Bewerbung 1' }).locator('[data-e2e="activity-journal-context-button"]').click();

  await expect(page.getByRole('heading', { name: /Tätigkeitsjournal/i }).first()).toBeVisible();
  await expect(page.getByLabel('Was wurde gemacht?')).toHaveValue(/SBV-Tätigkeit dokumentiert|Vorstellungsgespräch: SBV-Teilnahme dokumentiert/);
  await expect(page.locator('main')).not.toContainText('Bewerbung 1');
});
