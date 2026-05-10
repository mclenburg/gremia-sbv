import type { Page } from '@playwright/test';
import { test, expect } from './support/test';

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('executes a case inline command inside a large case note textarea', async ({ page }) => {
  await page.goto('/');
  await expect(mainNavigation(page).getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();

  await mainNavigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await expect(page.getByRole('heading', { name: /TEST-0001\s*·\s*Testperson Alpha/ })).toBeVisible();

  await page.getByRole('button', { name: /Notiz \/ Protokoll/ }).click();
  const noteDialog = page.getByRole('dialog', { name: /Neue Gesprächsnotiz \/ neues Protokoll/ });
  await expect(noteDialog).toBeVisible();

  const content = noteDialog.getByLabel('Inhalt');
  await content.fill('Gesprächsnotiz:\n/praev Arbeitsplatzgefährdung klären');

  const preventionDialog = page.getByRole('dialog', { name: 'Prävention anlegen' });
  await expect(preventionDialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Aufgabe einfügen' })).toHaveCount(0);
  await expect(preventionDialog.getByLabel('Titel')).not.toHaveValue('');
  await preventionDialog.getByLabel('Titel').fill('Arbeitsplatzgefährdung klären');

  await preventionDialog.getByRole('button', { name: 'Anlegen und weiterprotokollieren' }).click();
  await expect(preventionDialog).toBeHidden();
  await expect(content).toHaveValue(/Präventionsverfahren angelegt: Arbeitsplatzgefährdung klären/);
  await expect(content).not.toHaveValue(/\/praev/);
});

test('keeps anonymization marker modal width stable while typing', async ({ page }) => {
  await page.goto('/');
  await mainNavigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await expect(page.getByRole('heading', { name: /TEST-0001\s*·\s*Testperson Alpha/ })).toBeVisible();

  await page.getByRole('button', { name: /Notiz \/ Protokoll/ }).click();
  const noteDialog = page.getByRole('dialog', { name: /Neue Gesprächsnotiz \/ neues Protokoll/ });
  await expect(noteDialog).toBeVisible();

  const content = noteDialog.getByLabel('Inhalt');
  await content.fill('Gespräch mit ~~');

  const anonymizationDialog = page.getByRole('dialog', { name: 'Anonymisierung vormerken' });
  await expect(anonymizationDialog).toBeVisible();
  const before = await anonymizationDialog.boundingBox();
  expect(before).not.toBeNull();

  const labelInput = anonymizationDialog.getByLabel('Art der Textstelle');
  await labelInput.fill('Max Mustermann mit sehr langem ergänzendem Identifikator der nicht die Dialogbreite verändern darf');
  const afterLongText = await anonymizationDialog.boundingBox();
  expect(afterLongText).not.toBeNull();
  expect(Math.round(afterLongText!.width)).toBe(Math.round(before!.width));

  await labelInput.fill('x'.repeat(180));
  const afterUnbrokenText = await anonymizationDialog.boundingBox();
  expect(afterUnbrokenText).not.toBeNull();
  expect(Math.round(afterUnbrokenText!.width)).toBe(Math.round(before!.width));
});
