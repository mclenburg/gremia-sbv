import { test, expect } from './support/test';

test('Gremiensitzung verknüpft Personen und Fälle per Kurzbefehl im Freitext', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Dokumentation', exact: true }).click();
  await page.getByRole('button', { name: /Gremien/ }).click();
  await page.getByLabel('Titel').fill('Sitzung mit Bezügen');
  await page.getByLabel('Datum / Zeit').fill('2026-08-20T10:00');
  await page.getByRole('button', { name: 'Sitzung anlegen' }).click();
  await page.getByRole('row', { name: /Sitzung mit Bezügen/ }).click();
  await page.getByLabel('Neuer Tagesordnungspunkt').fill('Anliegen');
  await page.getByRole('button', { name: 'TOP hinzufügen' }).click();
  await page.getByRole('button', { name: 'Anliegen' }).click();

  const position = page.getByLabel('Eigene SBV-Position');
  await position.fill('Besprochen mit /person');
  const personDialog = page.getByRole('dialog', { name: 'Person verknüpfen' });
  await expect(personDialog).toBeVisible();
  await personDialog.getByLabel('Person suchen').fill('Mustermann');
  await personDialog.getByRole('button', { name: 'Max Mustermann' }).click();
  await expect(position).toHaveValue('Besprochen mit [[Person: Max Mustermann]]');

  await position.fill('Besprochen mit [[Person: Max Mustermann]] und /fall');
  const caseDialog = page.getByRole('dialog', { name: 'Fallbezug einfügen' });
  await expect(caseDialog).toBeVisible();
  await caseDialog.getByLabel('Fall suchen').fill('TEST-0001');
  await caseDialog.getByRole('button', { name: /TEST-0001/ }).click();
  await expect(position).toHaveValue('Besprochen mit [[Person: Max Mustermann]] und [[Fall: TEST-0001]]');
  await page.getByRole('button', { name: 'TOP-Daten speichern' }).click();
  const savedPosition = await page.evaluate(async () => {
    const meetings = await window.gremiaSbv.sbvOffice.meetings.list();
    return meetings.find((item) => item.title === 'Sitzung mit Bezügen')?.agenda[0]?.ownPosition;
  });
  expect(savedPosition).toBe('Besprochen mit [[Person: Max Mustermann]] und [[Fall: TEST-0001]]');
});
