import { test, expect } from './support/isolatedTest';

test('aktualisiert den Dashboard-Lesecache ausschließlich auf Aktion und erhält ihn bei Abruffehlern', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = window.gremiaSbv!.gremiaBr;
    const getSettings = bridge.getSettings;
    const getOverview = bridge.getDashboardOverview;
    const refreshCache = bridge.refreshCache;
    let attempts = 0;
    let refreshed = false;
    Object.assign(window, { __DASHBOARD_REFRESH_ATTEMPTS: () => attempts });
    bridge.getSettings = async () => ({ ...await getSettings(), enabled: true, autoRefreshOnStartup: false });
    bridge.getDashboardOverview = async () => ({
      ...await getOverview(),
      nextMeeting: { id: 'synthetic-meeting', title: refreshed ? 'Synthetische aktualisierte Sitzung' : 'Synthetische gespeicherte Sitzung' },
      meetingAgendas: { 'synthetic-meeting': [{ title: refreshed ? 'Synthetischer neuer TOP' : 'Synthetischer gespeicherter TOP' }] },
    });
    bridge.refreshCache = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Synthetischer Abruffehler');
      refreshed = true;
      return { ...await refreshCache(), status: 'ok', message: 'Synthetischer Cache aktualisiert', cached: await bridge.getDashboardOverview() };
    };
  });
  await page.goto('/');
  const card = page.getByLabel('Gremia.BR-Kooperationsbrücke');
  const agenda = page.getByRole('region', { name: 'Nächste BR-Sitzung mit Agenda', exact: true });
  await expect(agenda.getByText('Synthetischer gespeicherter TOP', { exact: true })).toBeVisible();
  const attempts = () => page.evaluate(() => (window as Window & { __DASHBOARD_REFRESH_ATTEMPTS: () => number }).__DASHBOARD_REFRESH_ATTEMPTS());
  expect(await attempts()).toBe(0);
  const refresh = card.getByRole('button', { name: 'Abrufen', exact: true });
  await refresh.focus();
  await refresh.press('Enter');
  await expect(agenda.getByRole('alert')).toHaveText('Synthetischer Abruffehler');
  await expect(agenda.getByText('Synthetischer gespeicherter TOP', { exact: true })).toBeVisible();
  await expect(refresh).toBeEnabled();
  expect(await attempts()).toBe(1);
  await refresh.press('Enter');
  await expect(agenda.getByRole('status')).toHaveText('Synthetischer Cache aktualisiert');
  await expect(agenda.getByRole('alert')).toHaveCount(0);
  await expect(agenda.getByText('Synthetischer neuer TOP', { exact: true })).toBeVisible();
  await expect(agenda.getByText('Synthetischer gespeicherter TOP', { exact: true })).toHaveCount(0);
  expect(await attempts()).toBe(2);
});

test('öffnet die fachlichen Dashboard-Ziele per Tastatur ohne Browser-Prompts', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => { dialogs.push(dialog.type()); await dialog.dismiss(); });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  for (const target of [
    { card: /Fälle/u, heading: 'Fälle' },
    { card: /Fristen/u, heading: 'Fristen' },
    { card: /Compliance-Center/u, heading: 'Compliance Center' },
  ]) {
    const action = page.locator('.dashboard-focus-grid').getByRole('button', { name: target.card });
    await action.focus();
    await action.press('Enter');
    await expect(page.getByRole('heading', { name: target.heading, exact: true }).first()).toBeVisible();
    await navigation.getByRole('button', { name: 'Dashboard', exact: true }).click();
  }
  expect(dialogs).toEqual([]);
});

test('stellt Formularfarben und vergrößerbare Textbereiche in beiden Themes aus den geladenen Tokens dar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Stellenbesetzungen', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Bewerbungsreferenz', exact: true });
  const textarea = page.getByRole('textbox', { name: 'Verfahrensnotiz zum Ereignis', exact: true });
  const select = page.getByRole('combobox', { name: 'Status filtern', exact: true });
  await expect(input).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    const textBackgroundToken = theme === 'light' ? '--industrial-light-control' : '--industrial-control-bg';
    for (const { field, token } of [
      { field: input, token: textBackgroundToken },
      { field: textarea, token: textBackgroundToken },
      { field: select, token: '--industrial-select-bg' },
    ]) {
      const expectedBackground = await page.evaluate((name) => {
        const probe = document.createElement('div');
        probe.style.background = `var(${name})`;
        document.body.append(probe);
        const background = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return background;
      }, token);
      expect(expectedBackground).not.toBe('rgba(0, 0, 0, 0)');
      await expect.poll(() => field.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(expectedBackground);
    }
    const textStyle = await textarea.evaluate((node) => {
      const style = getComputedStyle(node);
      return { resize: style.resize, minHeight: parseFloat(style.minHeight) };
    });
    expect(textStyle.resize).toBe('vertical');
    expect(textStyle.minHeight).toBeGreaterThan(0);
    for (const token of ['--industrial-control-bg-hover', '--industrial-control-border-focus', '--industrial-textarea-min-height', '--industrial-select-option-bg']) {
      expect(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(), token)).not.toBe('');
    }
  }
});
