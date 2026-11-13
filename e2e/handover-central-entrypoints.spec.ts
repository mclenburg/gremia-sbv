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

test('führt nach Dateiauswahl zum erkannten Importformat und hält die Formatauswahl per Tastatur bedienbar', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  const areas = page.getByRole('navigation', { name: 'Übergabe-Arbeitsbereiche Navigation' });
  await navigation.getByRole('button', { name: 'Übergaben', exact: true }).click();
  await areas.getByRole('button', { name: /^Urlaubsvertretung/ }).click();
  const format = page.getByRole('combobox', { name: 'Zielformat der Vertretungsinstanz' });
  await format.focus();
  await page.keyboard.press('ArrowDown');
  await expect(format).toHaveValue('4');
  await expect(format).toBeFocused();

  await areas.getByRole('button', { name: /^Import/ }).click();
  await page.getByRole('button', { name: 'Übergabedatei auswählen' }).click();
  await expect(page.getByRole('heading', { name: 'Format 4 erkannt' })).toBeFocused();
  await expect(page.getByRole('form', { name: 'Format-1-bis-4-Paket prüfen und importieren' })).toBeVisible();
});

test('zeigt nach Checklistenfehler eine erneute Prüfung statt eines endlosen Ladestatus', async ({ page }) => {
  await page.evaluate(() => {
    const original = window.gremiaSbv.caseHandover.checklist;
    window.gremiaSbv.caseHandover.checklist = async (input) => {
      if (window.localStorage.getItem('test-checklist-retry') !== 'ok') {
        throw new Error('Checkliste vorübergehend nicht erreichbar.');
      }
      return original(input);
    };
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Übergaben', exact: true }).click();
  await page.getByRole('navigation', { name: 'Übergabe-Arbeitsbereiche Navigation' })
    .getByRole('button', { name: /^Urlaubsvertretung/ }).click();
  const checklist = page.getByRole('group', { name: 'Übergabe-Checkliste' });
  await expect(checklist.getByRole('alert')).toContainText('nicht geprüft');
  await expect(checklist.getByText('Checkliste wird geprüft …')).toHaveCount(0);
  await page.evaluate(() => window.localStorage.setItem('test-checklist-retry', 'ok'));
  await checklist.getByRole('button', { name: 'Erneut prüfen' }).click();
  await expect(checklist.getByRole('button', { name: 'Erneut prüfen' })).toHaveCount(0);
  await expect(checklist.locator('[aria-label="Prüfpunkte der Übergabe"]')).toBeVisible();
});

test('verwirft die vorige Datei, wenn die nächste Dateiauswahl abgebrochen wird', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Übergaben', exact: true }).click();
  await page.getByRole('navigation', { name: 'Übergabe-Arbeitsbereiche Navigation' })
    .getByRole('button', { name: /^Import/ }).click();
  const importRegion = page.getByRole('region', { name: 'Übergabepaket auswählen und importieren' });
  await importRegion.getByRole('button', { name: 'Übergabedatei auswählen' }).click();
  await expect(importRegion.getByRole('heading', { name: 'Format 4 erkannt' })).toBeVisible();
  await page.evaluate(() => {
    window.gremiaSbv.caseHandover.selectFile = async () => ({ canceled: true });
  });
  await importRegion.getByRole('button', { name: 'Übergabedatei auswählen' }).click();
  await expect(importRegion.getByRole('heading', { name: 'Format 4 erkannt' })).toHaveCount(0);
  await expect(importRegion.getByRole('status')).toContainText('Kein Paket ausgewählt');
});
