import type { Locator } from '@playwright/test';
import { test, expect } from './support/test';

async function expectVisibleFocus(control: Locator) {
  await expect(control).toBeFocused();
  const focus = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor };
  });
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.style).not.toBe('none');
  expect(focus.color).not.toBe('rgba(0, 0, 0, 0)');
}

async function expectReadableText(control: Locator) {
  const contrast = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    let background = style.backgroundColor;
    let parent = element.parentElement;
    while (background === 'rgba(0, 0, 0, 0)' && parent) {
      background = getComputedStyle(parent).backgroundColor;
      parent = parent.parentElement;
    }
    const luminance = (color: string) => {
      const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      if (!channels || channels.length !== 3) throw new Error(`Nicht auswertbare Browserfarbe: ${color}`);
      const linear = channels.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const foreground = luminance(style.color);
    const backdrop = luminance(background);
    return (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
}

for (const theme of ['light', 'dark'] as const) {
  test(`zeigt Navigation mit erkennbaren Hover- und Fokuszuständen im Theme ${theme}`, async ({ page }) => {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
    const cases = navigation.getByRole('button', { name: 'Fallakte', exact: true });
    await page.mouse.move(1000, 0);
    await expect(cases).toHaveCSS('cursor', 'pointer');
    await expect(cases).toHaveCSS('border-radius', '0px');
    const restingBackground = await cases.evaluate((element) => getComputedStyle(element).backgroundImage);
    await cases.hover();
    await expect.poll(() => cases.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe(restingBackground);
    await cases.focus();
    await expectVisibleFocus(cases);
    await cases.press('Enter');
    await expect(page.locator('[data-e2e="case-row-TEST-0001"]')).toBeVisible();
    await navigation.getByRole('button', { name: 'Dashboard', exact: true }).click();
  });

  test(`hält die Datenschutz-Aktionsauswahl lesbar und per Tastatur bedienbar im Theme ${theme}`, async ({ page }) => {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Personen', exact: true }).click();
    await page.getByText('Mustermann, Max').click();
    const trigger = page.locator('[data-e2e="open-privacy-review-dialog"]');
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Prüfung bei Zweckfortfall' });
    await expect(dialog).toBeVisible();
    const action = dialog.getByRole('combobox', { name: 'Aktion', exact: true });
    await action.focus();
    await expectVisibleFocus(action);
    await expectReadableText(action);
    await action.fill('alle Freitexte');
    const option = dialog.getByRole('option', { name: 'Fallakte anonymisieren · alle Freitexte ersetzen', exact: true });
    await expect(option).toBeVisible();
    await expectReadableText(option);
    await action.press('Enter');
    await expect(action).toHaveValue('Fallakte anonymisieren · alle Freitexte ersetzen');
    await expect(action).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog.getByLabel('Bestätigung')).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}
