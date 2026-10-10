import { test, expect } from './support/test';

test('aligns edit and delete actions in a case note', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.getByRole('button', { name: /Synthetische Notiz mit Aktenbezug/ }).click();

  const note = page.locator('.case-detail-content')
    .filter({ has: page.getByRole('heading', { name: 'Synthetische Notiz mit Aktenbezug' }) });
  const edit = note.getByRole('button', { name: 'Bearbeiten' });
  const remove = note.getByRole('button', { name: 'Löschen' });
  await expect(edit).toBeVisible();
  await expect(remove).toBeVisible();
  for (const theme of ['dark', 'light']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    const editBox = await edit.boundingBox();
    const removeBox = await remove.boundingBox();
    expect(editBox).not.toBeNull();
    expect(removeBox).not.toBeNull();
    expect(Math.abs(editBox!.y - removeBox!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(editBox!.height - removeBox!.height)).toBeLessThanOrEqual(1);
  }
});
