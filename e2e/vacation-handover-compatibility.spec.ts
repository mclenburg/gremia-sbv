import { test, expect } from './support/test';

test('bietet für ältere Vertretungsinstanzen nur den passenden Paket- und Passwortschutz an', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Übergaben', exact: true }).click();
  await page.getByRole('navigation', { name: 'Übergabe-Arbeitsbereiche Navigation' })
    .getByRole('button', { name: /^Urlaubsvertretung/ }).click();

  const exportRegion = page.getByRole('region', { name: 'Urlaubsvertretung übergeben' });
  const targetFormat = exportRegion.getByRole('combobox', { name: 'Zielformat der Vertretungsinstanz' });
  await expect(targetFormat).toHaveValue('4');
  await targetFormat.selectOption('2');
  await expect(exportRegion.getByRole('combobox', { name: 'Schutzart' })).toHaveValue('passphrase_and_recipient_key');
  await expect(exportRegion.getByRole('option', { name: 'Nur Empfängerschlüssel' })).toHaveCount(0);
  await expect(exportRegion.getByLabel('Transport-Passphrase')).toBeVisible();
});
