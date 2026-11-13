import { test, expect } from './support/test';

test('führt Export und Import aus der Fallakte in dieselben zentralen Abläufe', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.getByRole('button', { name: 'Ausgewählte Fallakte als Übergabepaket exportieren' }).click();

  const vacation = page.getByRole('region', { name: 'Urlaubsvertretung übergeben' });
  await expect(vacation).toBeVisible();
  await expect(vacation.getByRole('combobox', { name: 'Zielformat der Vertretungsinstanz' })).toHaveValue('2');
  await expect(vacation.getByRole('group', { name: 'Fallakten für die Vertretung' })
    .getByRole('checkbox', { name: /TEST-0001/ })).toBeChecked();
  await expect(page.getByRole('dialog', { name: 'Übergabepaket exportieren' })).toHaveCount(0);

  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.getByRole('button', { name: 'Übergabe importieren' }).click();
  await expect(page.getByRole('region', { name: 'Übergabepaket auswählen und importieren' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Übergabepaket importieren' })).toHaveCount(0);
});

test('zeigt im Rückgaberegister jeweils nur den gewählten Ablauf', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Übergaben', exact: true }).click();
  await page.getByRole('navigation', { name: 'Übergabe-Arbeitsbereiche Navigation' })
    .getByRole('button', { name: /^Rückgabe/ }).click();

  const mode = page.getByRole('combobox', { name: 'Rückgabeablauf' });
  await expect(mode).toHaveValue('');
  await expect(page.getByRole('region', { name: 'Mobile Rückgabe importieren' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Format-5-Rückgabe exportieren' })).toHaveCount(0);
  await mode.selectOption('mobile');
  await expect(page.getByRole('region', { name: 'Mobile Rückgabe importieren' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Format-5-Rückgabe exportieren' })).toHaveCount(0);
  await mode.selectOption('v5');
  await expect(page.getByRole('region', { name: 'Format-5-Rückgabe exportieren' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Mobile Rückgabe importieren' })).toHaveCount(0);
  await mode.selectOption('legacy');
  await expect(page.getByRole('heading', { name: 'Änderungen aus der Vertretung zurückgeben' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Format-5-Rückgabe exportieren' })).toHaveCount(0);
});
