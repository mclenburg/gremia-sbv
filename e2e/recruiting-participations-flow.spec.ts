import { test, expect } from './support/test';
import type { Page } from '@playwright/test';

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openRecruiting(page: Page) {
  await mainNavigation(page).getByRole('button', { name: 'Stellenbesetzungen', exact: true }).click();

  const moduleFrame = page.locator('.module-frame').filter({
    has: page.getByRole('heading', { name: 'Stellenbesetzungen', exact: true }),
  });
  await expect(moduleFrame).toBeVisible();
  await expect(moduleFrame.getByRole('button', { name: 'Stellenbesetzung anlegen', exact: true })).toBeVisible();
}

test('tracks recruiting participation without case file and opens violation only as explicit prefill', async ({ page }) => {
  await openRecruiting(page);
  await page.locator('.industrial-hero-actions').getByRole('button', { name: 'Stellenbesetzung anlegen', exact: true }).click();
  const createDialog = page.getByRole('dialog', { name: 'Stellenbesetzung anlegen' });
  await expect(createDialog.getByRole('button', { name: 'Stellenbesetzung anlegen', exact: true })).toBeVisible();

  await createDialog.getByLabel(/Stelle \/ Bezeichnung/).fill('E2E Fachadministration');
  await createDialog.getByLabel('Kennziffer').fill('REC-095E');
  await createDialog.getByLabel('Organisationseinheit').fill('IT-Service');
  await createDialog.getByLabel('Unterrichtung erhalten').fill('2026-05-06');
  await createDialog.getByLabel('Schwerbehinderte / gleichgestellte Bewerbung bekannt').check();
  await createDialog.getByLabel('Unterlagen erhalten').fill('2026-05-07');
  await createDialog.getByLabel('Anhörung / Stellungnahme bis').fill('2026-05-14');
  await createDialog.getByLabel('Zur Verstoßprüfung vormerken').check();
  await createDialog.getByRole('button', { name: 'Stellenbesetzung anlegen', exact: true }).click();

  await expect(page.locator('.industrial-live-region[role="status"]').filter({ hasText: /Stellenbesetzung wurde angelegt/ })).toBeVisible();
  await expect(page.locator('.industrial-record-card').filter({ hasText: 'E2E Fachadministration' }).first()).toBeVisible();

  await page.locator('.industrial-hero-actions').getByRole('button', { name: 'Stellenbesetzung anlegen', exact: true }).click();
  const secondCreateDialog = page.getByRole('dialog', { name: 'Stellenbesetzung anlegen' });
  await expect(secondCreateDialog).toBeVisible();
  await expect(secondCreateDialog.getByLabel(/Stelle \/ Bezeichnung/)).toHaveValue('');
  await secondCreateDialog.getByLabel(/Stelle \/ Bezeichnung/).fill('E2E Zweite Stellenbesetzung');
  await secondCreateDialog.getByLabel('Kennziffer').fill('REC-095E-2');
  await secondCreateDialog.getByRole('button', { name: 'Stellenbesetzung anlegen', exact: true }).click();
  await expect(page.locator('.industrial-record-card').filter({ hasText: 'E2E Zweite Stellenbesetzung' }).first()).toBeVisible();

  await page.locator('.industrial-record-card').filter({ hasText: 'E2E Fachadministration' }).first().click();
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
  await expect(page.getByLabel('Ausgangskontext', { exact: true })).toHaveValue('recruiting_participation');
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
