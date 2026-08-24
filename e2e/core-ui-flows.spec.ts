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

  test('preserves the inline risk overlay in the centralized case-note textarea', async ({ page }) => {
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

  test('discards staged deadline and task actions when the note is cancelled', async ({ page }) => {
      await openView(page, 'Fallakte');
    await expect(page.getByRole('heading', { name: /TEST-0001\s*·\s*Testperson Alpha/ })).toBeVisible();

    await page.getByRole('button', { name: /Notiz \/ Protokoll/ }).click();
    const noteDialog = page.getByRole('dialog', { name: /Neue Gesprächsnotiz \/ neues Protokoll/ });
    await expect(noteDialog).toBeVisible();
    const content = noteDialog.getByLabel('Inhalt');

    const deadlineTitle = `Inline-Frist ${Date.now()}`;
    await content.fill('//');
    const deadlineDialog = page.getByRole('dialog', { name: /Frist aus Protokoll vormerken/ });
    await expect(deadlineDialog).toBeVisible();
    await deadlineDialog.getByLabel('Fristtitel').fill(deadlineTitle);
    await deadlineDialog.getByLabel('Ablaufdatum').fill('2026-08-20T10:30');
    await deadlineDialog.getByRole('button', { name: /Frist vormerken/ }).click();
    await expect(deadlineDialog).toBeHidden();
    await expect(content).not.toHaveValue(/\/\//);

    await expect(noteDialog.getByText('Vorgemerkte Inline-Aktionen')).toBeVisible();
    await expect(noteDialog.getByText(`Frist/Aufgabe: ${deadlineTitle}`)).toBeVisible();

    await noteDialog.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(noteDialog).toBeHidden();
    const deadlinePersisted = await page.evaluate(async (title) => {
      const bridge = (window as unknown as { gremiaSbv: { deadlines: { list: () => Promise<Array<{ title?: string; confidentialTitle?: string }>> } } }).gremiaSbv;
      const records = await bridge.deadlines.list();
      return records.some((record) => record.title === title || record.confidentialTitle === title);
    }, deadlineTitle);
    expect(deadlinePersisted).toBe(false);
  });

  test('discards a staged undated task when the note is cancelled', async ({ page }) => {
      await openView(page, 'Fallakte');
    await expect(page.getByRole('heading', { name: /TEST-0001\s*·\s*Testperson Alpha/ })).toBeVisible();

    await page.getByRole('button', { name: /Notiz \/ Protokoll/ }).click();
    const noteDialog = page.getByRole('dialog', { name: /Neue Gesprächsnotiz \/ neues Protokoll/ });
    await expect(noteDialog).toBeVisible();
    const content = noteDialog.getByLabel('Inhalt');

    const taskTitle = `Inline-Aufgabe ${Date.now()}`;
    await content.fill('>>');
    const taskDialog = page.getByRole('dialog', { name: /Offene Aufgabe ohne Datum/ });
    await expect(taskDialog).toBeVisible();
    await taskDialog.getByLabel('Aufgabe').fill(taskTitle);
    await taskDialog.getByRole('button', { name: /Aufgabe vormerken/ }).click();
    await expect(taskDialog).toBeHidden();
    await expect(noteDialog.getByText(`Frist/Aufgabe: ${taskTitle}`)).toBeVisible();

    await noteDialog.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(noteDialog).toBeHidden();
    await openView(page, 'Fristen');
    await expect(page.getByText(taskTitle)).toHaveCount(0);
  });

  test('persists staged inline actions only when the note is saved', async ({ page }) => {
      await openView(page, 'Fallakte');
    await expect(page.getByRole('heading', { name: /TEST-0001\s*·\s*Testperson Alpha/ })).toBeVisible();

    await page.getByRole('button', { name: /Notiz \/ Protokoll/ }).click();
    const noteDialog = page.getByRole('dialog', { name: /Neue Gesprächsnotiz \/ neues Protokoll/ });
    await expect(noteDialog).toBeVisible();
    await noteDialog.getByLabel('Titel').fill('Inline-Aktionen speichern');
    const content = noteDialog.getByLabel('Inhalt');

    await content.fill('//');
    const deadlineDialog = page.getByRole('dialog', { name: /Frist aus Protokoll vormerken/ });
    const deadlineTitle = 'Wiedervorlage: Inline-Aktionen speichern';
    await expect(deadlineDialog.getByLabel('Fristtitel')).toHaveValue(deadlineTitle);
    await deadlineDialog.getByLabel('Ablaufdatum').fill('2026-08-20T10:30');
    await deadlineDialog.getByRole('button', { name: /Frist vormerken/ }).click();
    await expect(deadlineDialog).toBeHidden();

    await expect(noteDialog.getByText(`Frist/Aufgabe: ${deadlineTitle}`)).toBeVisible();

    await noteDialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(noteDialog).toBeHidden();
    await openView(page, 'Fristen');
    await expect(page.getByText(deadlineTitle)).toBeVisible();
  });

  test('persists a global // deadline command from a regular text field into the central deadline register', async ({ page }) => {
    await openView(page, 'Journal');

    await page.getByRole('button', { name: 'Tätigkeit erfassen' }).click();
    const journalDialog = page.getByRole('dialog', { name: 'Tätigkeit erfassen' });
    await expect(journalDialog).toBeVisible();
    const description = journalDialog.getByLabel('Kurzbeschreibung / Kontext');
    await description.fill('//');
    const dialog = page.getByRole('dialog', { name: 'Frist anlegen' });
    await expect(dialog).toBeVisible();

    const title = `Globale Kurzbefehlsfrist ${Date.now()}`;
    await dialog.getByLabel('Titel').fill(title);
    await dialog.getByLabel('Datum').fill('2026-08-22T11:15');
    await dialog.getByRole('button', { name: 'Frist anlegen' }).click();
    await expect(dialog).toBeHidden();
    const replacement = `Frist bis 22.08.2026, 11:15: ${title}`;
    await expect(description).toHaveValue(replacement);

    await journalDialog.getByLabel('Was wurde gemacht?').fill('React-Render nach Kurzbefehlsersetzung');
    await expect(description).toHaveValue(replacement);

    await journalDialog.press('Escape');
    await expect(journalDialog).toBeHidden();
    await openView(page, 'Fristen');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('announces SBV resource create, update and delete operations to screen readers', async ({ page }) => {
      await openView(page, 'Dokumentation');

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
