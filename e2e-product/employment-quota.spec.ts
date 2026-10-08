import { test, expect, assertNoRuntimeErrors } from './support/productTest';

test('maßgebliche Arbeitsplätze steuern die Beschäftigungsquote im echten Tresor', async ({ productPage, runtimeErrors }) => {
  await productPage.evaluate(() => window.gremiaSbv.employerQuota.saveSettings({ chargeableWorkplaces: null }));
  const navigation = productPage.getByRole('navigation', { name: 'Hauptnavigation' });
  await productPage.locator('[data-e2e="main-nav-persons"]').click();
  await expect(productPage.getByRole('heading', { name: 'Beschäftigungsquote' })).toHaveCount(0);

  await navigation.getByRole('button', { name: 'Einstellungen' }).click();
  const workplaces = productPage.getByLabel('Maßgebliche Arbeitsplätze');
  await workplaces.fill('40');
  await productPage.getByRole('button', { name: 'Unternehmensgröße speichern' }).click();
  await expect(productPage.getByText('Maßgebliche Arbeitsplätze wurden gespeichert.', { exact: true })).toBeVisible();

  await productPage.locator('[data-e2e="main-nav-persons"]').click();
  const quota = productPage.getByRole('region', { name: 'Beschäftigungsquote' });
  await expect(quota).toBeVisible();
  await expect(quota.getByText('Pflichtplätze').locator('..').getByText('2')).toBeVisible();
  await expect(quota).toContainText('Aktuelle Orientierung');

  await navigation.getByRole('button', { name: 'Einstellungen' }).click();
  await expect(workplaces).toHaveValue('40');
  await workplaces.fill('');
  await productPage.getByRole('button', { name: 'Unternehmensgröße speichern' }).click();
  await productPage.locator('[data-e2e="main-nav-persons"]').click();
  await expect(productPage.getByRole('heading', { name: 'Beschäftigungsquote' })).toHaveCount(0);
  await assertNoRuntimeErrors(runtimeErrors);
});
