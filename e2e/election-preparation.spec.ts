import { test, expect } from './support/test';
import type { Page } from '@playwright/test';
function nav(page:Page){return page.getByRole('navigation',{name:'Hauptnavigation'});}
async function open(page: Page) {
  await nav(page).getByRole('button', { name: 'Wahlen', exact: true }).click();
  const electionRegion = page.getByRole('region', { name: 'SBV-Wahlen' });
  await expect(electionRegion.getByRole('heading', { name: 'SBV-Wahlen', level: 1 })).toBeVisible();
}

async function createElection(page: Page) {
  await open(page);
  await page.getByRole('button', { name: 'Wahlvorgang anlegen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Neuen Wahlvorgang anlegen' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Wahlart').selectOption('extraordinary_no_sbv');
  await dialog.getByLabel('Wahlgrund').fill('SBV vakant');
  await dialog.getByRole('button', { name: 'Wahlvorgang anlegen' }).click();
  await expect(dialog).toBeHidden();
}

test('Wahl-Setup marks four confirmed plus pending equalization below the five-person threshold', async ({ page }) => {
  await createElection(page);
  await page.getByLabel('Bestätigt schwerbehindert').fill('4');
  await page.getByLabel('Offene Gleichstellungsanträge').fill('1');
  await page.getByRole('button', { name: 'Prüfung speichern' }).click();
  await expect(page.getByText(/Mindestschwelle von fünf bestätigten Wahlberechtigten ist nicht erfüllt/)).toBeVisible();
  await page.getByLabel('Bestätigt gleichgestellt').fill('1');
  await page.getByLabel('Offene Gleichstellungsanträge').fill('0');
  await page.getByRole('button', { name: 'Prüfung speichern' }).click();
  await expect(page.getByText(/Mindestschwelle von fünf/)).toHaveCount(0);
});

test('Wahl-Setup proposes formal procedure at fifty and records a formal election board', async ({ page }) => {
  await createElection(page);
  await page.getByLabel('Bestätigt schwerbehindert').fill('50');
  await expect(page.getByText(/Vorschlag: förmliches Verfahren/)).toBeVisible();
  await page.getByRole('button', { name: 'Prüfung speichern' }).click();
  await page.getByRole('navigation', { name: 'SBV-Wahl Arbeitsbereiche' }).getByRole('button', { name: /^Wahlorgan\b/ }).click();
  await page.getByLabel('Name').fill('Vorsitz Test');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByText(/Vorsitz: Vorsitz Test/)).toBeVisible();
});

test('Wählerliste übernimmt standardmäßig bestätigte Personen und hält manuelle Erfassung nachrangig', async ({ page }) => {
  await createElection(page);
  await page.getByRole('navigation', { name: 'SBV-Wahl Arbeitsbereiche' }).getByRole('button', { name: /^Wählerliste\b/ }).click();

  await expect(page.getByRole('button', { name: 'Personen übernehmen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excel-/CSV importieren' })).toBeVisible();
  const manual = page.locator('details.election-manual-entry');
  await expect(manual).not.toHaveAttribute('open', '');

  await page.getByRole('button', { name: 'Personen übernehmen' }).click();
  await expect(page.getByText(/Mustermann, Max/)).toBeVisible();

  await manual.locator('summary').click();
  await expect(page.getByLabel('Nachname')).toBeVisible();
  await expect(page.getByLabel('Vorname')).toBeVisible();
});


test('Wählerlistenarbeit wird im Tätigkeitsjournal als SBV-Wahl vorbelegt', async ({ page }) => {
  await createElection(page);
  await page.getByRole('navigation', { name: 'SBV-Wahl Arbeitsbereiche' }).getByRole('button', { name: /^Wählerliste\b/ }).click();
  await page.getByRole('button', { name: 'Tätigkeit erfassen' }).click();
  await expect(page.getByRole('region', { name: 'Tätigkeitsjournal' }).getByRole('heading', { name: 'Tätigkeitsjournal', level: 1 })).toBeVisible();
  const journalEntry = page.getByRole('dialog', { name: 'Tätigkeit erfassen' });
  await expect(journalEntry).toBeVisible();
  await expect(journalEntry.getByLabel('Was wurde gemacht?')).toHaveValue('SBV-Wahl: Wählerliste');
  await expect(journalEntry.getByLabel('Kategorie')).toHaveValue('SBV-Selbstorganisation');
  await expect(page.getByText('Vorbelegung übernommen.')).toBeVisible();
  await expect(page.getByText(/voter_list/)).toHaveCount(0);
});
