import type { Page } from '@playwright/test';
import { test, expect } from './support/test';

type IcalDebugWindow = Window & {
  __GREMIA_SBV_E2E_ICAL_EXPORTS: Array<{ privacyLevel?: string; ics?: string }>;
};

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openView(page: Page, name: string, exact = true) {
  await mainNavigation(page).getByRole('button', { name, exact }).click();
}

test.describe('P12 core UI behavior contracts', () => {
  test('keeps the central deadline editor modal keyboard-safe and restores focus after Esc', async ({ page }) => {
    await page.goto('/');
    await openView(page, 'Fristen');

    const editButton = page.getByRole('button', { name: /Bearbeiten/ }).first();
    await expect(editButton).toBeVisible();
    await editButton.focus();
    await expect(editButton).toBeFocused();
    await editButton.press('Enter');

    const dialog = page.getByRole('dialog', { name: /Synthetische Wiedervorlage/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Titel')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: /Speichern/ })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(dialog.getByLabel('Titel')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(editButton).toBeFocused();
  });

  test('shows required-field feedback only after interaction or submit attempt', async ({ page }) => {
    await page.goto('/');
    await openView(page, 'Fristen');

    await expect(page.getByText('Bitte Titel und Fälligkeitsdatum erfassen.')).toHaveCount(0);
    await page.getByRole('button', { name: /Frist anlegen/ }).click();
    const createDialog = page.getByRole('dialog', { name: /Frist oder Wiedervorlage anlegen/ });
    await expect(createDialog).toBeVisible();

    const title = createDialog.getByLabel('Titel');
    await title.focus();
    await title.blur();
    await expect(page.getByText('Bitte Titel und Fälligkeitsdatum erfassen.')).toHaveCount(0);

    await createDialog.getByRole('button', { name: /Frist anlegen/ }).click();
    await expect(createDialog.getByText('Bitte Titel und Fälligkeitsdatum erfassen.')).toBeVisible();
  });

  test('preserves inline command overlay behavior in centralized large textareas', async ({ page }) => {
    await page.goto('/');
    await openView(page, 'Fallakte');
    await expect(page.getByRole('heading', { name: /TEST-0001\s*·\s*Testperson Alpha/ })).toBeVisible();

    await page.getByRole('button', { name: /Notiz \/ Protokoll/ }).click();
    const noteDialog = page.getByRole('dialog', { name: /Neue Gesprächsnotiz \/ neues Protokoll/ });
    await expect(noteDialog).toBeVisible();

    const content = noteDialog.getByLabel('Inhalt');
    await content.fill('Neue Einschätzung: /risiko hoch');

    const riskDialog = page.getByRole('dialog', { name: /Risiko markieren/ });
    await expect(riskDialog).toBeVisible();
    await expect(riskDialog.locator('label', { hasText: 'Risikostufe' })).toBeVisible();

    await riskDialog.getByRole('button', { name: 'Einfügen' }).click();
    await expect(riskDialog).toBeHidden();
    await expect(content).not.toHaveValue(/\/risiko/);
  });

  test('announces SBV resource create, update and delete operations to screen readers', async ({ page }) => {
    await page.goto('/');
    await openView(page, 'Steuerung');

    const form = page.locator('.sbv-resource-form');
    await expect(form.getByLabel('Titel / Anlass')).toBeVisible();
    await form.getByLabel('Titel / Anlass').fill('E2E-Schulung Barrierefreiheit');
    await form.getByLabel('Anbieter / Beteiligte').fill('E2E-Akademie');
    await form.getByRole('button', { name: /Nachweis speichern/ }).click();

    await expect(page.locator('.industrial-live-region[role="status"]')).toContainText('Nachweis wurde protokolliert.');
    await expect(page.getByText('Nachweis protokolliert.')).toBeVisible();

    await page.locator('.sbv-resource-record-main').filter({ hasText: 'E2E-Schulung Barrierefreiheit' }).click();
    await form.getByLabel('Titel / Anlass').fill('E2E-Schulung Barrierefreiheit aktualisiert');
    await form.getByRole('button', { name: /Nachweis aktualisieren/ }).click();

    await expect(page.locator('.industrial-live-region[role="status"]')).toContainText('Nachweis wurde aktualisiert.');
    await expect(page.getByText('Nachweis aktualisiert.')).toBeVisible();

    const deleteUpdatedResource = page.getByRole('button', {
      name: /Nachweis E2E-Schulung Barrierefreiheit aktualisiert löschen/,
    });
    await deleteUpdatedResource.focus();
    await expect(deleteUpdatedResource).toBeFocused();
    await deleteUpdatedResource.press('Enter');
    await expect(page.locator('.industrial-live-region[role="status"]')).toContainText('Nachweis wurde gelöscht.');
    await expect(page.getByText('Nachweis gelöscht.')).toBeVisible();
  });

  test('keeps export feedback announced and datensparsam in the deadline iCal flow', async ({ page }) => {
    await page.goto('/');
    await openView(page, 'Fristen');

    await page.locator('[data-e2e="open-deadline-ical-export"]').click();
    const exportDialog = page.getByRole('dialog', { name: /Kalenderdatei exportieren/ });
    await expect(exportDialog).toBeVisible();
    await exportDialog.locator('[data-e2e="deadline-ical-privacy-level"]').selectOption('privacy_first');
    await exportDialog.locator('[data-e2e="export-deadlines-ical"]').click();
    const exportFeedback = 'Fristenexport wurde erstellt.';
    await expect(exportDialog.locator('.module-feedback[role="status"]').filter({ hasText: exportFeedback })).toBeVisible();
    await expect(page.locator('.industrial-live-region[role="status"]').filter({ hasText: exportFeedback })).toHaveText(exportFeedback);

    const calls = await page.evaluate(() => (window as IcalDebugWindow).__GREMIA_SBV_E2E_ICAL_EXPORTS);
    expect(calls).toHaveLength(1);
    expect(calls[0].privacyLevel).toBe('privacy_first');
    expect(calls[0].ics).toContain('SUMMARY:Gremia.SBV Wiedervorlage');
    expect(calls[0].ics).not.toContain('TEST-0001');
    expect(calls[0].ics).not.toContain('Testperson Alpha');
  });
});
