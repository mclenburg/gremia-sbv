import { test, expect } from './support/test';

test('keeps search controls compact and within the panel in both entry points', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });

  for (const [route, screenshot] of [['Suche', 'search-global.png'], ['Fallakte', 'search-case.png']] as const) {
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: route, exact: true }).click();
    const panel = page.locator('.case-detail-panel').first();
    await expect(panel).toBeVisible();
    const layout = await panel.evaluate((element) => {
      const input = element.querySelector<HTMLInputElement>('[data-global-search-target="case-fulltext"]')!;
      const radios = [...element.querySelectorAll<HTMLInputElement>('.case-search-area-options input[type="radio"]')];
      const checkboxes = [...element.querySelectorAll<HTMLInputElement>('.case-search-source-filters input[type="checkbox"]')];
      const panelBox = element.getBoundingClientRect();
      const inputBox = input.getBoundingClientRect();
      const probe = document.createElement('span');
      probe.style.color = 'var(--industrial-accent)';
      element.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return {
        inputWidth: inputBox.width,
        panelWidth: panelBox.width,
        inputWithinPanel: inputBox.right <= panelBox.right,
        radioSizes: radios.map((radio) => ({ width: radio.getBoundingClientRect().width, height: radio.getBoundingClientRect().height })),
        radioAccents: radios.map((radio) => getComputedStyle(radio).accentColor),
        checkboxSizes: checkboxes.map((checkbox) => ({ width: checkbox.getBoundingClientRect().width, height: checkbox.getBoundingClientRect().height })),
        checkboxAccents: checkboxes.map((checkbox) => getComputedStyle(checkbox).accentColor),
        accent,
      };
    });
    expect(layout.inputWidth).toBeGreaterThanOrEqual(layout.panelWidth - 90);
    expect(layout.inputWithinPanel).toBe(true);
    expect(layout.radioSizes).toHaveLength(3);
    expect(layout.radioSizes.every(({ width, height }) => width <= 20 && height <= 20)).toBe(true);
    expect(layout.radioAccents.every((value) => value === layout.accent)).toBe(true);
    expect(layout.checkboxSizes.length).toBeGreaterThan(0);
    expect(layout.checkboxSizes.every(({ width, height }) => width <= 20 && height <= 20)).toBe(true);
    expect(layout.checkboxAccents.every((value) => value === layout.accent)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(screenshot), fullPage: true });
  }

  await page.setViewportSize({ width: 900, height: 900 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  for (const route of ['Suche', 'Fallakte']) {
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: route, exact: true }).click();
    const panel = page.locator('.case-detail-panel').first();
    const layout = await panel.evaluate((element) => {
      const input = element.querySelector<HTMLInputElement>('[data-global-search-target="case-fulltext"]')!;
      const panelBox = element.getBoundingClientRect();
      const inputBox = input.getBoundingClientRect();
      return { overflow: element.scrollWidth > element.clientWidth + 1, inputWidth: inputBox.width,
        inputWithinPanel: inputBox.right <= panelBox.right };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.inputWithinPanel).toBe(true);
    expect(layout.inputWidth).toBeGreaterThan(250);
  }
});
