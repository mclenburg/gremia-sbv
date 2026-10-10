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
    expect(layout.radioSizes).toHaveLength(route === 'Suche' ? 3 : 0);
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
      const choices = [...element.querySelectorAll<HTMLInputElement>('.industrial-choice-input')];
      const panelBox = element.getBoundingClientRect();
      const inputBox = input.getBoundingClientRect();
      const probe = document.createElement('span');
      probe.style.color = 'var(--industrial-accent)';
      element.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return { overflow: element.scrollWidth > element.clientWidth + 1, inputWidth: inputBox.width,
        inputWithinPanel: inputBox.right <= panelBox.right,
        choiceWidths: choices.map((choice) => choice.getBoundingClientRect().width),
        choiceAccents: choices.map((choice) => getComputedStyle(choice).accentColor), accent };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.inputWithinPanel).toBe(true);
    expect(layout.inputWidth).toBeGreaterThan(250);
    if (route === 'Suche') expect(layout.choiceWidths.length).toBeGreaterThan(3);
    else expect(layout.choiceWidths.length).toBeGreaterThan(0);
    expect(layout.choiceWidths.every((width) => width <= 20)).toBe(true);
    expect(layout.choiceAccents.every((accent) => accent === layout.accent)).toBe(true);
  }
});

test('limits search from the case workbench to its selected case', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Fallakte', exact: true }).click();
  const panel = page.locator('.case-detail-panel').first();
  await expect(panel.locator('.case-search-area-options')).toHaveCount(0);
  await panel.getByRole('textbox', { name: 'Diese Fallakte durchsuchen' }).fill('synthetisch');
  await panel.getByRole('button', { name: 'Suchen', exact: true }).click();

  await expect.poll(() => page.evaluate(() => {
    const calls = (window as Window & { __GREMIA_SBV_E2E_SEARCH_CALLS?: Array<{ area: string; currentCaseId?: string }> })
      .__GREMIA_SBV_E2E_SEARCH_CALLS;
    return calls?.at(-1);
  })).toMatchObject({ area: 'current_case', currentCaseId: expect.any(String) });
});
