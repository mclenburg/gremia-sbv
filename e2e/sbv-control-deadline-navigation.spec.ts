import { test, expect } from './support/test';

test('opens a protocol follow-up in the exact protocol form', async ({ page }) => {
  await page.evaluate(async () => {
    const protocol = await window.gremiaSbv.sbvControlProtocols.create({
      title: 'E2E Protokoll A', meetingAt: '2026-05-06', followUpDueAt: '2026-05-20', status: 'follow_up_open',
    });
    await window.gremiaSbv.sbvControlProtocols.create({ title: 'E2E Protokoll B', meetingAt: '2026-05-07' });
    await window.gremiaSbv.deadlines.create({
      processId: protocol.id, processType: 'sbv_control_protocol', deadlineType: 'follow_up',
      title: 'Protokoll nachhalten', dueAt: '2026-05-20T10:00:00.000Z',
      sourceEvent: 'sbv_control_protocol.follow_up', severity: 'important',
      calculationMode: 'manual', isLegalDeadline: false,
    });
  });
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Dokumentation', exact: true }).click();
  await navigation.getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'Protokoll nachhalten' });
  await row.getByRole('button', { name: 'Protokoll öffnen' }).click();
  const form = page.getByRole('form', { name: 'Protokoll bearbeiten' });
  await expect(form).toBeFocused();
  await expect(form.getByLabel('Titel / Anlass')).toHaveValue('E2E Protokoll A');
  await expect(form.getByLabel('Wiedervorlage / Frist')).toHaveValue('2026-05-20');
});

test('reports a missing linked protocol without selecting another one', async ({ page }) => {
  await page.evaluate(async () => {
    await window.gremiaSbv.sbvControlProtocols.create({ title: 'Anderes Protokoll', meetingAt: '2026-05-07' });
    await window.gremiaSbv.deadlines.create({
      processId: 'missing-protocol', processType: 'sbv_control_protocol', deadlineType: 'follow_up',
      title: 'Fehlendes Protokoll nachhalten', dueAt: '2026-05-20T10:00:00.000Z',
      sourceEvent: 'sbv_control_protocol.follow_up', severity: 'important',
      calculationMode: 'manual', isLegalDeadline: false,
    });
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fristen', exact: true }).click();
  const row = page.getByRole('table', { name: 'Offene Fristen und Wiedervorlagen' }).locator('tbody tr').filter({ hasText: 'Fehlendes Protokoll nachhalten' });
  await row.getByRole('button', { name: 'Protokoll öffnen' }).click();
  await expect(page.getByText('Das verknüpfte SBV-Protokoll ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.')).toBeVisible();
  await expect(page.getByRole('form', { name: 'Protokoll bearbeiten' })).toHaveCount(0);
});
