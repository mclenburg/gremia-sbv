import { test, expect } from './support/test';

test('opens a past-year assembly deadline at the source record and follow-up section', async ({ page }) => {
  const assemblyId = await page.evaluate(async () => {
    const assembly = await window.gremiaSbv.sbvOffice.assemblies.save({
      year: 2024, status: 'held', employerReportStatus: 'completed', minutes: 'E2E Ergebnis aus der Versammlung 2024',
    });
    await window.gremiaSbv.deadlines.create({
      processId: assembly.id, processType: 'sbv_assembly', deadlineType: 'follow_up',
      title: 'E2E Versammlung 2024 nachbereiten', dueAt: '2026-05-20T10:00:00.000Z',
      sourceEvent: 'sbv_assembly_follow_up', severity: 'important', calculationMode: 'workflow', isLegalDeadline: false,
    });
    return assembly.id;
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'E2E Versammlung 2024 nachbereiten' });
  await row.getByRole('button', { name: 'Versammlung öffnen' }).click();
  await expect(page.getByLabel('Versammlungsjahr')).toHaveValue('2024');
  await expect(page.getByRole('heading', { name: 'Schwerbehindertenversammlung 2024' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ergebnis und Nachbereitung' })).toBeFocused();
  await expect(page.getByLabel('SBV-Ergebnisprotokoll / Maßnahmen')).toHaveValue('E2E Ergebnis aus der Versammlung 2024');
  await expect(page.getByLabel('Folgeaufgabe / Wiedervorlage')).toBeVisible();
  expect(assemblyId).toBeTruthy();
});

test('reports a missing linked assembly without opening the current year', async ({ page }) => {
  await page.evaluate(async () => {
    await window.gremiaSbv.deadlines.create({
      processId: 'missing-assembly', processType: 'sbv_assembly', deadlineType: 'follow_up',
      title: 'E2E Fehlende Versammlung', dueAt: '2026-05-20T10:00:00.000Z',
      sourceEvent: 'sbv_assembly_follow_up', severity: 'important', calculationMode: 'workflow', isLegalDeadline: false,
    });
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'E2E Fehlende Versammlung' });
  await row.getByRole('button', { name: 'Versammlung öffnen' }).click();
  await expect(page.getByText('Die verknüpfte Versammlung ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.')).toBeVisible();
  await expect(page.getByLabel('Versammlungsjahr')).toHaveValue(String(new Date().getFullYear()));
});
