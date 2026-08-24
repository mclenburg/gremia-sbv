import { test, expect } from './support/test';

function shortcutForHelp() {
  return process.platform === 'darwin' ? 'Meta+H' : 'Control+H';
}

test('supports keyboard navigation through primary RC areas', async ({ page }) => {

  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-e2e="case-row-TEST-0001"]')).toBeVisible();

  await navigation.getByRole('button', { name: 'Compliance', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Compliance|Technischer Datenschutzstatus/i }).first()).toBeVisible();
});

test('keeps inline help accessible by dialog role, trapped focus, Escape and focus return', async ({ page }) => {

  const trigger = page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Fallakte', exact: true });
  await trigger.focus();
  await page.keyboard.press(shortcutForHelp());

  const dialog = page.locator('[data-e2e="inline-help-dialog"]');
  const search = page.getByLabel(/Kurzbefehle durchsuchen/);
  const firstFocusable = dialog.getByRole('button', { name: 'Kurzbefehle schließen' });
  const lastFocusable = dialog.getByRole('button', { name: 'Schließen', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Kurzbefehle/ })).toBeVisible();
  await expect(search).toBeFocused();

  await firstFocusable.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(lastFocusable).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(firstFocusable).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('renders note entity links with fachliche accessible labels instead of UUIDs', async ({ page }) => {
  await page.locator('[data-e2e="main-nav-cases"]').click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.getByRole('button', { name: /Synthetische Notiz mit Aktenbezug/ }).click();

  const link = page.locator('[data-e2e="note-entity-link"]').first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAccessibleName(/BEM-Testvorgang/);
  await expect(link).not.toHaveAccessibleName(/link-test|bem-test|case-test/);
});

test('supports keyboard-only person selection and case creation from selected person', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Personen', exact: true }).focus();
  await page.keyboard.press('Enter');

  await page.locator('.person-list-select').filter({ hasText: 'Mustermann, Max' }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Fallakte anlegen' })).toBeEnabled();
  await page.getByRole('button', { name: 'Fallakte anlegen' }).focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Fallakte aus Person anlegen' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Aktenzeichen')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Fallakte anlegen' })).toBeFocused();
});

test('supports keyboard-only anonymous request path and announces binding feedback', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Fallakte anlegen', exact: true }).focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Neue Fallakte anlegen' });
  await dialog.getByLabel('Aktenzeichen').fill('TEST-A11Y-ANON');
  await dialog.locator('[data-e2e="anonymous-request-path"]').focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-e2e="case-row-TEST-A11Y-ANON"]')).toBeVisible();
  await expect(page.getByRole('status')).toContainText(/Anonyme Anfrage wurde angelegt|Fallakte wurde/);
});


test('keeps the measure deletion reason select readable and keyboard-operable in dark mode', async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem('gremia.sbv.theme', 'dark');
    window.localStorage.setItem('gremia-sbv-theme', 'dark');
    document.documentElement.dataset.theme = 'dark';
  });

  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  await page.getByRole('button', { name: 'BEM löschen', exact: true }).click();

  const dialog = page.locator('[data-e2e="case-process-delete-dialog"]');
  await expect(dialog).toBeVisible();
  const reason = dialog.getByLabel('Löschgrund');
  await expect(reason).toBeVisible();
  await reason.focus();
  await expect(reason).toBeFocused();
  await reason.selectOption('duplicate');
  await expect(reason).toHaveValue('duplicate');

  const colors = await reason.evaluate((element) => {
    const select = element as HTMLSelectElement;
    const selectStyle = window.getComputedStyle(select);
    const optionStyle = window.getComputedStyle(select.options[0]);
    return {
      selectColor: selectStyle.color,
      selectBackground: selectStyle.backgroundColor,
      colorScheme: selectStyle.colorScheme,
      optionColor: optionStyle.color,
      optionBackground: optionStyle.backgroundColor,
    };
  });
  expect(colors.colorScheme).toContain('dark');
  expect(colors.selectColor).not.toBe(colors.selectBackground);
  expect(colors.optionColor).not.toBe(colors.optionBackground);
  expect(colors.optionColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(colors.optionBackground).not.toBe('rgba(0, 0, 0, 0)');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'BEM löschen', exact: true })).toBeFocused();
});


test('keeps a clearly visible focus indicator on inline-command search results', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await navigation.getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.getByRole('button', { name: /Notiz \/ Protokoll/ }).click();

  const noteDialog = page.getByRole('dialog', { name: /Neue Gesprächsnotiz \/ neues Protokoll/ });
  const content = noteDialog.getByLabel('Inhalt');
  await content.fill('/fall TEST');

  const commandDialog = page.getByRole('dialog', { name: 'Fallbezug verknüpfen' });
  const searchInput = commandDialog.getByLabel('Fall suchen');
  await expect(searchInput).toBeFocused();
  await page.keyboard.press('Tab');

  const result = commandDialog.locator('.inline-contact-results button').first();
  await expect(result).toBeFocused();
  const focusStyle = await result.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
    };
  });

  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(focusStyle.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
});


test('provides a keyboard skip link to the main content', async ({ page }) => {
  const skipLink = page.getByRole('link', { name: 'Zum Hauptinhalt springen' });
  await expect(skipLink).toHaveAttribute('href', '#main-content');
  const keyboardOrder = await skipLink.evaluate((element) => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((candidate) => candidate.tabIndex >= 0);
    return { tabIndex: (element as HTMLAnchorElement).tabIndex, isFirst: candidates[0] === element };
  });
  expect(keyboardOrder).toEqual({ tabIndex: 0, isFirst: true });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('keeps legacy modal focus contained and restores the trigger', async ({ page }) => {
  await page.locator('[data-e2e="main-nav-cases"]').click();
  await page.locator('[data-e2e="case-row-TEST-0001"]').click();
  const trigger = page.getByRole('button', { name: /Notiz \/ Protokoll/ });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: /Neue Gesprächsnotiz \/ neues Protokoll/ });
  const title = dialog.getByLabel('Titel');
  await expect(title).toBeFocused();
  const cancel = dialog.getByRole('button', { name: 'Abbrechen' });
  const save = dialog.getByRole('button', { name: 'Speichern' });
  await save.focus();
  await page.keyboard.press('Tab');
  await expect(title).toBeFocused();
  await title.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(save).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(cancel).toBeHidden();
});

test('reflows without document-level horizontal scrolling at narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.locator('[data-e2e="main-nav-cases"]').click();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test('honors reduced motion and exposes a visible forced-colors focus indicator', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  const dashboardButton = page.locator('[data-e2e="main-nav-dashboard"]');
  const navButton = page.locator('[data-e2e="main-nav-cases"]');
  await dashboardButton.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(navButton).toBeFocused();
  const style = await navButton.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      outlineStyle: computed.outlineStyle,
      outlineWidth: Number.parseFloat(computed.outlineWidth),
      transitionDuration: computed.transitionDuration,
    };
  });
  expect(style.outlineStyle).not.toBe('none');
  expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
  const transitionSeconds = style.transitionDuration.split(',').map((value) => {
    const duration = value.trim();
    const numeric = Number.parseFloat(duration);
    return duration.endsWith('ms') ? numeric / 1000 : numeric;
  });
  expect(Math.max(...transitionSeconds)).toBeLessThanOrEqual(0.00001);
});
