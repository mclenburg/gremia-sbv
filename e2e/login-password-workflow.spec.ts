import { test, expect } from './support/isolatedTest';

test('entsperrt per Tastatur und meldet Passwortfehler zugänglich', async ({ page }) => {
  await page.goto('/?auth=locked');
  const password = page.getByLabel('App-Passwort', { exact: true });
  await expect(password).toBeFocused();
  await password.fill('zu-kurz');
  await password.press('Enter');
  await expect(page.getByRole('alert')).toContainText('mindestens 12 Zeichen');
  await expect(password).toBeVisible();
  await password.fill('anderes-lang-passwort');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await password.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Entsperren fehlgeschlagen');
  await password.fill('korrekt-pferd-batterie');
  await password.press('Enter');
  await expect(password).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
});

test('öffnet die App erst nach ausdrücklicher Bestätigung des Recovery-Keys', async ({ page }) => {
  await page.goto('/?auth=setup');
  const password = page.getByLabel('Initialpasswort', { exact: true });
  const repeat = page.getByLabel('Initialpasswort wiederholen', { exact: true });
  await expect(password).toBeFocused();
  await password.fill('korrekt-pferd-batterie');
  await repeat.fill('anderes-lang-passwort');
  await repeat.press('Enter');
  await expect(page.getByRole('alert')).toContainText('stimmen nicht überein');
  await repeat.fill('korrekt-pferd-batterie');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await repeat.press('Enter');
  await expect(page.getByRole('heading', { name: 'Sicher verwahren', exact: true })).toBeVisible();
  await expect(page.getByText('ABCD-EFGH-IJKL-MNOP', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0);
  const confirm = page.getByRole('button', { name: 'Ich habe den Recovery-Key sicher gespeichert', exact: true });
  await confirm.focus();
  await confirm.press('Enter');
  await expect(confirm).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
});

test('kehrt aus der Wiederherstellung mit leerem Passwort zum Login zurück', async ({ page }) => {
  await page.goto('/?auth=locked');
  await page.getByLabel('App-Passwort', { exact: true }).fill('zu-kurz');
  await page.getByRole('button', { name: 'Entsperren', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  const recovery = page.getByRole('button', { name: 'Passwort vergessen? Recovery-Key verwenden', exact: true });
  await recovery.focus();
  await recovery.press('Enter');
  await expect(page.getByRole('heading', { name: 'Passwort vergessen', exact: true })).toBeVisible();
  await expect(page.getByLabel('Recovery-Key', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zum Entsperren', exact: true }).click();
  const password = page.getByLabel('App-Passwort', { exact: true });
  await expect(password).toHaveValue('');
  await expect(password).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
