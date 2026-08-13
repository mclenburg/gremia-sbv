import { test, expect, PRODUCT_PASSWORD, assertNoRuntimeErrors } from './support/productTest';

test.describe.configure({ mode: 'serial' });

const changedPassword = 'Gremia-SBV-E2E!2026-neu';

test('Sperren und Entsperren läuft über echten Preload, IPC und SecurityService', async ({ productPage, runtimeErrors }) => {
  await productPage.getByRole('button', { name: 'Sperren', exact: true }).click();
  await productPage.getByLabel('App-Passwort', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await productPage.getByLabel('App-Passwort', { exact: true }).fill(PRODUCT_PASSWORD);
  await productPage.getByRole('button', { name: 'Entsperren' }).click();
  await productPage.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor({ state: 'visible' });
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Lock blendet Fachinhalte aus und sperrt IPC-Datenzugriffe bis zur erneuten Entsperrung', async ({ productPage, runtimeErrors }) => {
  await productPage.getByRole('button', { name: 'Sperren', exact: true }).click();
  await expect(productPage.getByLabel('App-Passwort', { exact: true })).toBeVisible();
  await expect(productPage.getByRole('navigation', { name: 'Hauptnavigation' })).toBeHidden();

  const lockedAccess = await productPage.evaluate(async () => {
    try {
      await window.gremiaSbv.cases.list();
      return { rejected: false, message: '' };
    } catch (error) {
      return { rejected: true, message: error instanceof Error ? error.message : String(error) };
    }
  });
  expect(lockedAccess.rejected).toBe(true);
  expect(lockedAccess.message).toMatch(/gesperrt|Datenbankzugriff verweigert|unlock/i);

  await productPage.getByLabel('App-Passwort', { exact: true }).fill(PRODUCT_PASSWORD);
  await productPage.getByRole('button', { name: 'Entsperren' }).click();
  await productPage.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor({ state: 'visible' });
  const cases = await productPage.evaluate(async () => window.gremiaSbv.cases.list());
  expect(Array.isArray(cases)).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Passwortänderung wird wirksam und altes Passwort abgelehnt', async ({ productPage, runtimeErrors }) => {
  const result = await productPage.evaluate(async ({ current, next }) => window.gremiaSbv.security.changePassword(current, next), { current: PRODUCT_PASSWORD, next: changedPassword });
  expect(result.ok).toBe(true);
  await productPage.getByRole('button', { name: 'Sperren', exact: true }).click();
  await productPage.getByLabel('App-Passwort', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await productPage.getByLabel('App-Passwort', { exact: true }).fill(PRODUCT_PASSWORD);
  await productPage.getByRole('button', { name: 'Entsperren' }).click();
  await expect(productPage.getByText('Das Passwort ist nicht korrekt.', { exact: true })).toBeVisible();
  await productPage.getByLabel('App-Passwort', { exact: true }).fill(changedPassword);
  await productPage.getByRole('button', { name: 'Entsperren' }).click();
  await productPage.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor({ state: 'visible' });
  const restored = await productPage.evaluate(async ({ current, next }) => window.gremiaSbv.security.changePassword(current, next), { current: changedPassword, next: PRODUCT_PASSWORD });
  expect(restored.ok).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Datenbankintegrität, Auditkette und Selbstcheck laufen im echten Produkt', async ({ productPage, runtimeErrors }) => {
  const [database, audit, selfCheck] = await productPage.evaluate(async () => Promise.all([
    window.gremiaSbv.compliance.databaseIntegrityStatus(),
    window.gremiaSbv.compliance.auditChainStatus(),
    window.gremiaSbv.compliance.selfCheck(),
  ]));
  expect(database).toBeTruthy();
  expect(audit).toBeTruthy();
  expect(selfCheck).toBeTruthy();
  await assertNoRuntimeErrors(runtimeErrors);
});
