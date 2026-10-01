import { test, expect } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('uses /zeit start-time suggestion without persisting before save', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Tätigkeitsjournal/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Tätigkeit erfassen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tätigkeit erfassen' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('textbox', { name: 'Kurzbeschreibung / Kontext' }).fill('00:01');
  await expect(dialog.getByText(/Bis jetzt: 00:01-/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog.getByLabel('Zeitmodus')).toHaveValue('range');

  await dialog.getByRole('textbox', { name: 'Was wurde gemacht?' }).fill('E2E Tätigkeit ohne Echtdaten');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/Tätigkeit wurde bewusst als SBV-Eigenaufzeichnung gespeichert/)).toBeVisible();
});

test('opens a journal follow-up at its exact source entry', async ({ page }) => {
  await page.evaluate(async () => {
    const entry = await window.gremiaSbv.activityJournal.create({
      title: 'E2E Journal-Wiedervorlage',
      description: 'Synthetischer Hintergrund der Wiedervorlage',
      resultNote: 'Ausgangsstand dokumentiert',
      status: 'follow_up_open',
      followUpDueAt: '2026-05-20',
    });
    await window.gremiaSbv.deadlines.create({
      processId: entry.id,
      processType: 'activity_journal',
      deadlineType: 'follow_up',
      title: entry.title,
      dueAt: '2026-05-20T10:00:00.000Z',
      sourceEvent: 'activity_journal.follow_up',
      severity: 'normal',
      calculationMode: 'workflow',
      isLegalDeadline: false,
    });
  });
  await mainNavigation(page).getByRole('button', { name: 'Journal', exact: true }).click();
  await mainNavigation(page).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'E2E Journal-Wiedervorlage' });
  await row.getByRole('button', { name: 'Journaleintrag öffnen' }).click();
  const detail = page.getByRole('dialog', { name: 'E2E Journal-Wiedervorlage' });
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('Synthetischer Hintergrund der Wiedervorlage');
  await expect(detail).toContainText('Ausgangsstand dokumentiert');
  await expect(detail).toContainText('20.05.2026');
  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
});
