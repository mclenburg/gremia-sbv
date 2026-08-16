import { test, expect } from './support/test';
import type { Page } from '@playwright/test';

function nav(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openElection(page: Page) {
  await page.goto('/');
  await nav(page).getByRole('button', { name: 'Wahlen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'SBV-Wahlen', exact: true })).toBeVisible();
}

test('Wahlbereich uses the common help-on-demand dialog and restores focus', async ({ page }) => {
  await openElection(page);
  const help = page.getByRole('button', { name: 'Hilfe zum aktuellen Wahlbereich öffnen' });
  await help.focus();
  await help.click();
  const dialog = page.locator('[data-e2e="industrial-help-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Wahleinleitung' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Schließen' }).click();
  await expect(help).toBeFocused();
});

test('Wahltag checklist remains usable without persisting an individual vote', async ({ page }) => {
  await openElection(page);
  await page.getByLabel('Wahlart').selectOption('extraordinary_no_sbv');
  await page.getByLabel('Wahlgrund').fill('Vakanz');
  await page.getByRole('button', { name: 'Wahlvorgang anlegen' }).click();
  await page.getByLabel('Bestätigt schwerbehindert').fill('5');
  await page.getByRole('button', { name: 'Prüfung speichern' }).click();
  await page.getByRole('navigation', { name: 'SBV-Wahl Arbeitsbereiche' }).getByRole('button', { name: /^Stimmabgabe\b/ }).click();
  await page.getByLabel('Unbeobachtete Kennzeichnung gewährleistet').check();
  await page.getByLabel('Wahlurne gesichert').check();
  await page.getByRole('button', { name: /Checkpunkte dokumentieren/i }).click();
  await expect(page.getByText('Wahltag-Checkpunkte dokumentiert.')).toBeVisible();
  await expect(page.getByText(/keine Individualstimme/i)).toBeVisible();
});

test('office workflow help is available for the release-critical SBV work areas', async ({ page }) => {
  await page.goto('/');
  await nav(page).getByRole('button', { name: 'Dokumentation', exact: true }).click();
  const sections = [
    ['Gremien', /Hilfe zu Gremiensitzungen öffnen/],
    ['Versammlung', /Hilfe zur Schwerbehindertenversammlung öffnen/],
    ['Arbeitgeberpflichten', /Hilfe zu Arbeitgeberpflichten öffnen/],
    ['Inklusionsvereinbarung', /Hilfe zur Inklusionsvereinbarung öffnen/],
  ] as const;
  for (const [section, helpName] of sections) {
    await page.getByRole('button', { name: new RegExp(section) }).click();
    const help = page.getByRole('button', { name: helpName });
    await expect(help).toBeVisible();
    await help.click();
    await expect(page.locator('[data-e2e="industrial-help-dialog"]')).toBeVisible();
    await page.locator('[data-e2e="industrial-help-dialog"]').getByRole('button', { name: 'Schließen' }).click();
  }
});
