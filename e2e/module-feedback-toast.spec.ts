import { test, expect } from './support/test';

test('keeps action feedback visible at the viewport top and dismisses it by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 600 });
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Vorlagen', exact: true }).click();
  await page.getByRole('button', { name: /Neue Vorlage/ }).click();
  const dialog = page.getByRole('dialog', { name: /Vorlage ergänzen/ });
  await dialog.getByLabel('Titel').fill('E2E Toast-Vorlage');
  await dialog.getByLabel('Kategorie').fill('SBV-Beteiligung');
  await dialog.getByLabel('Betreff').fill('E2E Benachrichtigung');
  await dialog.getByRole('textbox', { name: 'Text', exact: true }).fill('Synthetischer Vorlagentext.');
  await dialog.getByRole('button', { name: /Vorlage speichern/ }).click();

  const feedback = page.locator('.module-feedback').filter({ hasText: 'Eigene Vorlage wurde gespeichert' });
  await expect(feedback).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(async () => {
    const box = await feedback.boundingBox();
    return box?.y ?? Number.POSITIVE_INFINITY;
  }).toBeLessThan(40);
  await expect(feedback).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 640 });
  const mobileBox = await feedback.boundingBox();
  expect(mobileBox).not.toBeNull();
  expect(mobileBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileBox!.x + mobileBox!.width).toBeLessThanOrEqual(390);
  const close = feedback.getByRole('button', { name: 'Meldung schließen' });
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(feedback).toBeHidden();
});

test('keeps dialog error feedback visible and returns focus inside the dialog', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 600 });
  await page.evaluate(() => {
    window.gremiaSbv.contacts.create = async () => { throw new Error('Kontakt konnte nicht angelegt werden.'); };
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Kontakte', exact: true }).click();
  await page.getByRole('button', { name: 'Kontakt anlegen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Kontakt anlegen' });
  await dialog.getByLabel('Vorname').fill('Test');
  await dialog.getByRole('button', { name: 'Kontakt speichern' }).click();

  const feedback = dialog.locator('.module-feedback').filter({ hasText: 'Kontakt konnte nicht angelegt werden.' });
  await expect(feedback).toBeInViewport();
  await expect(feedback).toHaveAttribute('role', 'alert');
  const close = feedback.getByRole('button', { name: 'Meldung schließen' });
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeFocused();
  await expect(feedback).toBeHidden();
});
