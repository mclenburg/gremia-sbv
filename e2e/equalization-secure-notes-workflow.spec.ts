import { test, expect } from './support/isolatedTest';

test('überträgt ungespeicherte sensible Entwürfe nicht auf ein anderes Verfahren', async ({ page }) => {
  await page.addInitScript(() => {
    const timestamp = new Date().toISOString();
    window.gremiaSbv!.equalization.list = async () => [
      { id: 'synthetic-first', caseId: 'case-test-0001', applicationStatus: 'beratung', createdAt: timestamp, updatedAt: timestamp },
      { id: 'synthetic-second', caseId: 'case-test-0001', applicationStatus: 'eingereicht', createdAt: timestamp, updatedAt: timestamp },
    ];
    window.gremiaSbv!.equalization.warnings = async () => [];
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.locator('.case-tree-node').filter({ hasText: /^Gleichstellung[\s\S]*beratung/u }).click();
  const draft = page.getByRole('textbox', { name: 'Neue verschlüsselte Notiz', exact: true });
  await draft.fill('Synthetischer Entwurf für das erste Verfahren');
  await draft.press('Tab');
  await page.locator('.case-tree-node').filter({ hasText: /^Gleichstellung[\s\S]*eingereicht/u }).click();
  await expect(draft).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Verschlüsselte Notiz speichern', exact: true })).toBeDisabled();
  expect(await page.evaluate(async () => (await window.gremiaSbv!.cases.listNotes('case-test-0001')).filter((note) => note.content.startsWith('[[equalization:synthetic-')).length)).toBe(0);
});

test('speichert sensible Gleichstellungsnotizen nur ausdrücklich und erhält fehlgeschlagene Entwürfe', async ({ page }) => {
  await page.addInitScript(() => {
    const timestamp = new Date().toISOString();
    const process = { id: 'synthetic-equalization', caseId: 'case-test-0001', applicationStatus: 'beratung', createdAt: timestamp, updatedAt: timestamp };
    window.gremiaSbv!.equalization.list = async () => [{ ...process }];
    window.gremiaSbv!.equalization.warnings = async () => [];
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.locator('.case-tree-node').filter({ hasText: /^Gleichstellung/u }).click();
  const section = page.getByRole('region', { name: 'Verschlüsselte SBV-Notizen / nächste Schritte', exact: true });
  const draft = section.getByRole('textbox', { name: 'Neue verschlüsselte Notiz', exact: true });
  const save = section.getByRole('button', { name: 'Verschlüsselte Notiz speichern', exact: true });
  await expect(save).toBeDisabled();
  await draft.fill('Synthetischer vertraulicher Entwurf');
  await draft.press('Tab');
  expect(await page.evaluate(async () => (await window.gremiaSbv!.cases.listNotes('case-test-0001')).filter((note) => note.content.startsWith('[[equalization:synthetic-equalization]]')).length)).toBe(0);
  await expect(save).toBeEnabled();
  await page.evaluate(() => {
    const original = window.gremiaSbv!.cases.createNote;
    let failNext = true;
    window.gremiaSbv!.cases.createNote = async (input) => {
      if (failNext) { failNext = false; throw new Error('Synthetischer Speicherfehler'); }
      return original(input);
    };
  });
  await save.focus();
  await save.press('Enter');
  await expect(section.getByRole('alert')).toHaveText('Die verschlüsselte Notiz konnte nicht gespeichert werden.');
  await expect(draft).toHaveValue('Synthetischer vertraulicher Entwurf');
  await expect(save).toBeEnabled();
  await save.press('Enter');
  await expect(section.getByText('Synthetischer vertraulicher Entwurf', { exact: true })).toBeVisible();
  await expect(draft).toHaveValue('');
  await expect(save).toBeDisabled();
  await expect(section.getByRole('alert')).toHaveCount(0);
  const stored = await page.evaluate(async () => (await window.gremiaSbv!.cases.listNotes('case-test-0001')).filter((note) => note.content.startsWith('[[equalization:synthetic-equalization]]')));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    caseId: 'case-test-0001', containsHealthData: true, confidentialLevel: 'hoch_sensibel',
    content: '[[equalization:synthetic-equalization]]\nSynthetischer vertraulicher Entwurf',
  });
});
