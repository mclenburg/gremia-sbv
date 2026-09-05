import { test, expect } from './support/test';

test('führt eine Amtsübergabe vom geprüften Export bis zum bestätigten Import durch', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Übergaben', exact: true })
    .click();

  const exportRegion = page.getByRole('region', { name: 'Amtsübergabe erstellen' });
  await expect(exportRegion).toBeVisible();
  await expect(exportRegion.getByText(/Tätigkeitsjournal wird nicht übergeben/)).toBeVisible();
  await exportRegion.getByRole('checkbox', { name: /TEST-0001 Testperson Alpha/ }).check();
  await exportRegion.getByLabel('Empfängerkennung der Nachfolgeinstanz').fill('GSBV1.TEST-EMPFÄNGER');
  await exportRegion.getByLabel('Transport-Passphrase').fill('Sichere Amtsübergabe 2026');
  await exportRegion.getByRole('checkbox', { name: /Fallauswahl.*geprüft/ }).check();
  await exportRegion.getByRole('button', { name: 'Amtsübergabe exportieren' }).click();
  await expect(exportRegion.getByText('Amtsübergabepaket gespeichert')).toBeVisible();

  const importRegion = page.getByRole('region', { name: 'Übergabe oder Rückgabe importieren' });
  await importRegion.getByLabel('Transport-Passphrase').fill('Sichere Amtsübergabe 2026');
  await importRegion.getByRole('button', { name: 'Datei auswählen und Paket prüfen' }).click();
  await expect(importRegion.getByText(/Amtsübergabe geprüft/)).toBeVisible();
  await expect(importRegion.getByRole('radio', { name: 'Als neuen lokalen Amtsbestand übernehmen' })).toBeChecked();
  await expect(importRegion.getByRole('checkbox', { name: /Fristen- und Aufbewahrungsregeln/ })).toBeChecked();
  await importRegion.getByRole('button', { name: 'Geprüftes Paket importieren' }).click();
  await expect(importRegion.getByText(/Amtsbestand wurde dauerhaft übernommen/)).toBeVisible();
});
