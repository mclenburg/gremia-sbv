import { test, expect } from './support/test';

test('ändert den Sitzungsstatus und erhält SBV-Notizen zum TOP', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Sitzungen', exact: true }).click();

  const creation = page.getByRole('region', { name: 'Sitzung manuell anlegen' });
  await creation.getByRole('textbox', { name: 'Titel' }).fill('Sitzung mit SBV-Notizen');
  await creation.getByLabel('Datum / Zeit').fill('2026-11-12T10:00');
  await creation.getByRole('button', { name: 'Sitzung anlegen' }).click();

  const row = page.getByRole('row', { name: /Sitzung mit SBV-Notizen auswählen/ });
  await expect(row).toContainText('Entwurf');
  await page.getByRole('combobox', { name: 'Sitzungsstatus' }).selectOption('planned');
  await page.getByRole('button', { name: 'Status speichern' }).click();
  await expect(row).toContainText('Geplant');

  await page.getByRole('textbox', { name: 'Neuer Tagesordnungspunkt' }).fill('Arbeitsplätze');
  await page.getByRole('button', { name: 'TOP hinzufügen' }).click();
  const top = page.getByRole('group', { name: 'TOP bearbeiten: Arbeitsplätze' });
  await top.getByRole('textbox', { name: 'Eigene SBV-Position / Notizen zum TOP' }).fill('Unterlagen für die Beratung nachfordern.');
  await top.getByRole('button', { name: 'TOP-Daten speichern' }).click();

  await navigation.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await navigation.getByRole('button', { name: 'Sitzungen', exact: true }).click();
  await row.click();
  await page.getByRole('button', { name: 'Arbeitsplätze', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Eigene SBV-Position / Notizen zum TOP' }))
    .toHaveValue('Unterlagen für die Beratung nachfordern.');
});
