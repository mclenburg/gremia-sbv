import { test, expect, assertNoRuntimeErrors } from './support/productTest';

test('Test-Tresor ist vor Fachtests initialisiert, entsperrt und bedienbar', async ({ productPage, runtimeErrors }) => {
  const status = await productPage.evaluate(async () => window.gremiaSbv.security.status());

  expect(status.initialized).toBe(true);
  expect(status.unlocked).toBe(true);
  await expect(productPage.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await assertNoRuntimeErrors(runtimeErrors);
});
