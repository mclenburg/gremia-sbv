import { test, expect } from './support/isolatedTest';

test('führt Backup-Aktionen über benannte Felder aus und meldet bestätigte Ergebnisse', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor();
  await page.evaluate(() => {
    Object.assign(window.gremiaSbv!, {
      backup: {
        create: async (passphrase: string) => ({
          ok: passphrase === 'Synthetische Passphrase',
          fileName: 'synthetisch.gsbvbackup', fileCount: 3, totalBytes: 1024,
        }),
        inspect: async (passphrase: string) => ({
          ok: passphrase === 'Synthetische Passphrase',
          fileName: 'synthetisch.gsbvbackup', verifiedAt: '2030-01-01T12:00:00Z',
        }),
        restore: async (passphrase: string, confirmation: string) => ({
          ok: passphrase === 'Synthetische Passphrase' && confirmation === 'BACKUP WIEDERHERSTELLEN',
          restartRequired: true, fileName: 'synthetisch.gsbvbackup',
          error: 'Bestätigung fehlt.',
        }),
      },
    });
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: /Einstellungen/i }).click();
  await page.getByRole('tab', { name: /^Sicherheit/ }).click();
  const form = page.locator('.settings-section-full').filter({ has: page.getByRole('heading', { name: 'Backup & Wiederherstellung', exact: true }) });
  const createPanel = form.locator('.industrial-subpanel').filter({ has: page.getByRole('heading', { name: 'Backup erstellen', exact: true }) });
  const inspectPanel = form.locator('.industrial-subpanel').filter({ has: page.getByRole('heading', { name: 'Backup prüfen', exact: true }) });
  const restorePanel = form.locator('.industrial-subpanel').filter({ has: page.getByRole('heading', { name: 'Wiederherstellen', exact: true }) });

  await createPanel.getByLabel('Backup-Passphrase', { exact: true }).fill('kurz');
  await createPanel.getByRole('button', { name: 'Backup speichern' }).focus();
  await page.keyboard.press('Enter');
  await expect(form.getByRole('alert')).toHaveText('Die Backup-Passphrase muss mindestens 12 Zeichen lang sein.');
  await expect(form.getByRole('status')).toHaveCount(0);

  await createPanel.getByLabel('Backup-Passphrase', { exact: true }).fill('Synthetische Passphrase');
  await createPanel.getByRole('button', { name: 'Backup speichern' }).focus();
  await page.keyboard.press('Enter');
  await expect(form.getByRole('status')).toContainText('Backup-Vorgang abgeschlossen.');
  await expect(form.getByRole('status')).toContainText('synthetisch.gsbvbackup');
  await expect(form.getByRole('alert')).toHaveCount(0);

  await inspectPanel.getByLabel('Backup-Passphrase', { exact: true }).fill('Synthetische Passphrase');
  await inspectPanel.getByRole('button', { name: 'Backup prüfen', exact: true }).click();
  await expect(form.getByRole('status')).toContainText('Backup erfolgreich geprüft.');

  await restorePanel.getByLabel('Backup-Passphrase', { exact: true }).fill('Synthetische Passphrase');
  await restorePanel.getByRole('button', { name: 'Backup wiederherstellen' }).click();
  await expect(form.getByRole('alert')).toHaveText('Bestätigung fehlt.');
  await expect(form.getByRole('status')).toHaveCount(0);
  await restorePanel.getByLabel('Bestätigung: BACKUP WIEDERHERSTELLEN', { exact: true }).fill('BACKUP WIEDERHERSTELLEN');
  await restorePanel.getByRole('button', { name: 'Backup wiederherstellen' }).focus();
  await page.keyboard.press('Enter');
  await expect(form.getByRole('status')).toContainText('Wiederherstellung vorbereitet.');
  await expect(form.getByRole('status')).toContainText('Bitte Gremia.SBV jetzt vollständig schließen und neu starten.');
  await expect(form.getByRole('alert')).toHaveCount(0);
});
