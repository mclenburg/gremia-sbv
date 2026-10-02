import { test, expect } from './support/isolatedTest';

test('meldet den Kopplungsdateiaustausch zugänglich und übernimmt nur gelesene Antworten', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor();
  await page.evaluate(() => {
    const testWindow = window as Window & { finishPairingExport?: () => void };
    let reads = 0;
    Object.assign(window.gremiaSbv!.caseHandover, {
      listMobileDevices: async () => [],
      createMobilePairingRequest: async () => ({
        sessionId: 'pairing-feedback', createdAt: new Date().toISOString(),
        pairingRequest: 'public-test-request', desktopInstanceId: 'ABCDE', desktopKeyFingerprint: 'test',
      }),
      cancelMobilePairing: async () => undefined,
      exportMobilePairingRequest: () => new Promise<boolean>((resolve) => {
        testWindow.finishPairingExport = () => resolve(true);
      }),
      readMobilePairingResponse: async () => {
        reads += 1;
        if (reads === 1) return 'public-test-response';
        if (reads === 2) return null;
        throw new Error('synthetic file error');
      },
    });
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Übergaben', exact: true }).click();
  await page.getByRole('navigation', { name: 'Übergabe-Arbeitsbereiche Navigation' })
    .getByRole('button', { name: /^Begleit-App/ }).click();
  await page.getByRole('button', { name: 'Mobilgerät koppeln', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Mobilgerät koppeln' });
  const status = page.locator('.industrial-live-region[role="status"]');
  const alert = page.locator('.industrial-live-region[role="alert"]');
  const save = dialog.getByRole('button', { name: 'Anfragedatei speichern' });
  const read = dialog.getByRole('button', { name: 'Antwortdatei öffnen' });
  await save.click();
  await expect(status).toHaveText('Kopplungsdatei wird verarbeitet …');
  await expect(save).toBeDisabled();
  await expect(read).toBeDisabled();
  await page.evaluate(() => (window as Window & { finishPairingExport?: () => void }).finishPairingExport?.());
  await expect(status).toHaveText('Öffentliche Kopplungsanfrage gespeichert.');
  await expect(save).toBeEnabled();
  await read.click();
  await expect(dialog.getByLabel('Pairingantwort der App')).toHaveValue('public-test-response');
  await expect(status).toHaveText('Pairingantwort übernommen. Bitte den Sicherheitscode vergleichen.');
  await read.click();
  await expect(status).toHaveText('Dateiauswahl abgebrochen.');
  await expect(dialog.getByLabel('Pairingantwort der App')).toHaveValue('public-test-response');
  await read.click();
  await expect(alert).toContainText('Kopplungsdatei konnte nicht verarbeitet werden.');
  await expect(alert).not.toContainText('synthetic file error');
  await expect(read).toBeEnabled();
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
