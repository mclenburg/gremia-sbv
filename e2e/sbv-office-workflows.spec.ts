import { test, expect } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openDocumentation(page: import('@playwright/test').Page) {
  await page.goto('/');
  await mainNavigation(page).getByRole('button', { name: 'Dokumentation', exact: true }).click();
}

test('Gremiensitzung: relevanter Beschluss kann zur Aussetzung geführt werden', async ({ page }) => {
  await openDocumentation(page);
  await page.getByRole('button', { name: /Gremien/ }).click();
  await page.getByLabel('Titel').fill('BR-Sitzung E2E');
  await page.getByLabel('Datum / Zeit').fill('2026-08-20T10:00');
  await page.getByRole('button', { name: 'Sitzung anlegen' }).click();
  await page.getByRole('row', { name: /BR-Sitzung E2E/ }).click();
  await expect(page.getByRole('heading', { name: 'BR-Sitzung E2E' })).toBeVisible();
  await page.getByLabel('Neuer Tagesordnungspunkt').fill('Arbeitsplatzverlagerung');
  await page.getByRole('button', { name: 'TOP hinzufügen' }).click();
  await page.getByRole('button', { name: 'Arbeitsplatzverlagerung' }).click();
  await page.getByLabel('Beschlussdatum / Zeit').fill('2026-08-20T11:00');
  await page.getByLabel('erhebliche Beeinträchtigung wichtiger Interessen').check();
  await page.getByRole('button', { name: /Aussetzung/ }).click();
  await expect(page.getByText(/27\.8\.2026/)).toBeVisible();
});

test('Schwerbehindertenversammlung: planen, Dokument erzeugen und durchführen', async ({ page }) => {
  await openDocumentation(page);
  await page.getByRole('button', { name: /Versammlung/ }).click();
  await page.getByLabel('Termin').fill('2026-10-15T14:00');
  await page.getByLabel('Einladung versandt am').fill('2026-09-30');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.getByRole('button', { name: 'Einladung', exact: true }).click();
  await page.getByRole('button', { name: 'Durchgeführt dokumentieren' }).click();
  await expect(page.getByRole('heading', { name: /Schwerbehindertenversammlung 2026/ })).toBeVisible();
});

test('§ 163-Jahresprüfung: fällig, Eingang und Prüfung dokumentieren', async ({ page }) => {
  await openDocumentation(page);
  await page.getByRole('button', { name: /Arbeitgeberpflichten/ }).click();
  await page.getByRole('button', { name: /Jahresprüfung 2025 anlegen/ }).click();
  await page.getByLabel('Prüfvorgang bearbeiten').selectOption({ label: /2025.*Anzeige und Verzeichnis/ });
  await page.getByRole('button', { name: 'Eingang dokumentieren' }).click();
  await page.getByRole('button', { name: 'Prüfung dokumentieren' }).click();
  await expect(page.getByLabel('Prüfvorgang bearbeiten')).toHaveValue(/obligation-2025/);
});

test('Inklusionsvereinbarung: Antrag, Themenstatus und Evaluation', async ({ page }) => {
  await openDocumentation(page);
  await page.getByRole('button', { name: /Inklusionsvereinbarung/ }).click();
  await page.getByRole('button', { name: 'Verhandlungsakte anlegen' }).click();
  await page.getByLabel('Verhandlungsakte').selectOption({ index: 1 });
  await page.getByLabel('Themenfeld').selectOption({ label: /Personalplanung/ });
  await page.getByLabel('SBV-Ziel').fill('Verbindliche Berücksichtigung');
  await page.getByLabel('Vereinbarung / Ergebnis').fill('In Verhandlung aufgenommen');
  await page.getByRole('button', { name: 'Themenfeld speichern' }).click();
  await page.getByLabel('Evaluation am').fill('2027-08-16');
  await page.getByRole('button', { name: 'Evaluation vormerken' }).click();
  await expect(page.getByText('10 Themenfelder offen')).toBeVisible();
});
