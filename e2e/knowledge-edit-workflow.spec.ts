import { test, expect } from './support/isolatedTest';

test('sucht Normen und speichert Ergänzungen mit bestätigtem Feedback und erhaltenen Fehlerentwürfen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).waitFor();
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Wissen', exact: true }).click();
  const region = page.getByLabel('Wissensdatenbank', { exact: true });
  await region.getByLabel('Suchbegriff', { exact: true }).fill('178');
  const source = region.getByRole('combobox', { name: 'Quelle der Wissenssuche' });
  await source.fill('SGB');
  await source.press('Enter');
  await expect(source).toHaveValue('SGB IX');
  await region.getByRole('button', { name: 'Suchen', exact: true }).focus();
  await page.keyboard.press('Enter');
  await region.getByRole('button', { name: /§ 178 SGB IX/ }).first().click();
  await expect(region.getByRole('heading', { name: /§ 178 SGB IX/ })).toBeVisible();
  const status = page.locator('.industrial-live-region[role="status"]');
  const alert = page.locator('.industrial-live-region[role="alert"]');
  const commentPanel = region.locator('.industrial-subpanel').filter({ has: page.getByRole('heading', { name: 'Eigene Kommentare', exact: true }) });
  await commentPanel.getByLabel('Titel', { exact: true }).fill('Synthetischer Kommentar');
  await commentPanel.getByPlaceholder('Kommentar', { exact: true }).fill('Bestätigten Beteiligungsablauf dokumentieren');
  await commentPanel.getByRole('button', { name: 'Speichern', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('Kommentar gespeichert.');
  await expect(commentPanel.getByText('Synthetischer Kommentar', { exact: true })).toBeVisible();
  await expect(commentPanel.getByLabel('Titel', { exact: true })).toHaveValue('');
  await expect(commentPanel.getByPlaceholder('Kommentar', { exact: true })).toHaveValue('');

  const checklistPanel = region.locator('.industrial-subpanel').filter({ has: page.getByRole('heading', { name: 'Checkliste', exact: true }) });
  await checklistPanel.getByLabel('Checklisteneintrag', { exact: true }).fill('Unterlagen vollständig prüfen');
  await checklistPanel.getByRole('button', { name: 'Ergänzen', exact: true }).click();
  await expect(status).toHaveText('Checklisteneintrag ergänzt.');
  await expect(checklistPanel.getByText('□ Unterlagen vollständig prüfen', { exact: true })).toBeVisible();
  await expect(checklistPanel.getByLabel('Checklisteneintrag', { exact: true })).toHaveValue('');

  await page.evaluate(() => {
    window.gremiaSbv!.knowledge.createComment = async () => { throw new Error('Synthetischer Speicherfehler'); };
  });
  await commentPanel.getByLabel('Titel', { exact: true }).fill('Entwurf behalten');
  await commentPanel.getByPlaceholder('Kommentar', { exact: true }).fill('Noch nicht gespeichert');
  await commentPanel.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(alert).toHaveText('Synthetischer Speicherfehler');
  await expect(commentPanel.getByLabel('Titel', { exact: true })).toHaveValue('Entwurf behalten');
  await expect(commentPanel.getByPlaceholder('Kommentar', { exact: true })).toHaveValue('Noch nicht gespeichert');
  await expect(commentPanel.getByText('Entwurf behalten', { exact: true })).toHaveCount(0);
});
