import { test, expect } from './support/test';
import {
  VISUAL_QA_BADGE_SELECTORS,
  VISUAL_QA_CONTROL_SELECTORS,
  VISUAL_QA_ROUTES,
  VISUAL_QA_SURFACE_SELECTORS,
  WORKBENCH_LAYOUT_QA_ROUTES,
  isHelpDialogQaRoute,
  isDarkModeLightLeak,
  isLightModeDarkFallback,
  isReadableSurfaceContrast,
  isRoundedLegacyPill,
  type VisualSurfaceSample,
  type VisualTheme,
} from '../src/app/shared/theme/visualQa';
import type { Locator, Page } from '@playwright/test';

function shortcutForHelp() {
  return process.platform === 'darwin' ? 'Meta+H' : 'Control+H';
}

async function setTheme(page: Page, theme: VisualTheme) {
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', /^(light|dark)$/);
  const apply = (value: VisualTheme) => {
    window.localStorage.setItem('gremia.sbv.theme', value);
    window.localStorage.setItem('gremia-sbv-theme', value);
    document.documentElement.dataset.theme = value;
  };
  await page.evaluate(apply, theme);
  await expect(root).toHaveAttribute('data-theme', theme);
}

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openRoute(page: Page, navName: string) {
  await mainNavigation(page).getByRole('button', { name: navName, exact: true }).click();
}

type BrowserSurfaceSample = VisualSurfaceSample & {
  readonly text: string;
  readonly className: string;
};

type BrowserBadgeSample = {
  readonly text: string;
  readonly className: string;
  readonly radiusPx: number;
};

function visualProbeScript({ surfaceSelectors, badgeSelectors, controlSelectors }: { surfaceSelectors: string; badgeSelectors: string; controlSelectors: string }) {
  function parseRgb(value: string): [number, number, number] | null {
    const rgbMatch = value.match(/rgba?\(([-.\d]+),\s*([-.\d]+),\s*([-.\d]+)/i);
    if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];

    const srgbMatch = value.match(/color\(srgb\s+([-.\d]+)\s+([-.\d]+)\s+([-.\d]+)/i);
    if (srgbMatch) {
      return [Number(srgbMatch[1]), Number(srgbMatch[2]), Number(srgbMatch[3])].map((part) =>
        part <= 1 ? Math.round(part * 255) : part,
      ) as [number, number, number];
    }

    return null;
  }

  function luminance(value: string): number {
    const rgb = parseRgb(value);
    if (!rgb) return 0;
    return (rgb[0] * 0.2126) + (rgb[1] * 0.7152) + (rgb[2] * 0.0722);
  }

  function isTransparent(value: string): boolean {
    return value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || /rgba\([^)]*,\s*0\)/i.test(value);
  }

  function effectiveBackground(element: Element): string {
    let current: Element | null = element;
    while (current) {
      const color = getComputedStyle(current).backgroundColor;
      if (color && !isTransparent(color)) return color;
      current = current.parentElement;
    }
    const rootColor = getComputedStyle(document.documentElement).backgroundColor;
    if (rootColor && !isTransparent(rootColor)) return rootColor;
    return getComputedStyle(document.body).backgroundColor;
  }

  function isVisible(element: Element): boolean {
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function labelFor(element: Element): string {
    return (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 90);
  }

  function classNameFor(element: Element): string {
    const className = element.getAttribute('class') ?? '';
    return className.replace(/\s+/g, ' ').trim();
  }

  function collectSurfaces(selectors: string): BrowserSurfaceSample[] {
    return Array.from(document.querySelectorAll(selectors))
      .filter(isVisible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          selector: selectors,
          backgroundLuminance: luminance(effectiveBackground(element)),
          textLuminance: luminance(style.color),
          area: Math.round(rect.width * rect.height),
          text: labelFor(element),
          className: classNameFor(element),
        };
      });
  }

  function collectBadges(selectors: string): BrowserBadgeSample[] {
    return Array.from(document.querySelectorAll(selectors))
      .filter(isVisible)
      .map((element) => {
        const style = getComputedStyle(element);
        const radiusValues = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]
          .map((radius) => Number.parseFloat(radius) || 0);
        return {
          text: labelFor(element),
          className: classNameFor(element),
          radiusPx: Math.max(...radiusValues),
        };
      });
  }

  return {
    surfaces: collectSurfaces(surfaceSelectors),
    controls: collectSurfaces(controlSelectors),
    badges: collectBadges(badgeSelectors),
  };
}



async function collectIndustrialWorkspaceContract(root: Locator) {
  return root.evaluate((panel) => {
    function isVisible(element: Element): element is HTMLElement {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    }

    const controls = Array.from(panel.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea')).filter(isVisible);
    const checkboxes = Array.from(panel.querySelectorAll('input[type="checkbox"]')).filter(isVisible);
    const controlViolations = controls.flatMap((control) => {
      const style = getComputedStyle(control);
      const rect = control.getBoundingClientRect();
      const field = control.closest('.industrial-field');
      const allowedClass = control.classList.contains('industrial-input')
        || control.classList.contains('industrial-select')
        || control.classList.contains('industrial-textarea-input');
      const problems: string[] = [];
      if (!field) problems.push('nicht in .industrial-field');
      if (!allowedClass) problems.push('kein zentrales Industrial-Control');
      if ((Number.parseFloat(style.borderTopWidth) || 0) < 1) problems.push('kein sichtbarer Rahmen');
      if (style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0, 0, 0, 0)') problems.push('transparenter Control-Hintergrund');
      if (rect.height < 32) problems.push(`zu geringe Höhe ${Math.round(rect.height)}px`);
      return problems.map((problem) => `${control.tagName.toLowerCase()}[${control.getAttribute('aria-label') ?? control.getAttribute('name') ?? control.id ?? ''}]: ${problem}`);
    });

    const checkboxViolations = checkboxes.flatMap((checkbox) => checkbox.closest('.industrial-checkbox-field') ? [] : ['Checkbox nutzt nicht das zentrale CheckboxField']);
    const fieldSpacingViolations = Array.from(panel.querySelectorAll('.industrial-field')).filter(isVisible).flatMap((field) => {
      const control = field.querySelector('input, select, textarea');
      if (!(control instanceof HTMLElement)) return [];
      const gap = Number.parseFloat(getComputedStyle(field).rowGap) || 0;
      const label = field.querySelector('.industrial-field-label-text')?.textContent?.trim() || control.getAttribute('aria-label') || control.id || control.tagName.toLowerCase();
      return gap < 4 ? [`${label}: Label und Control ohne ausreichenden Grid-Abstand (${gap}px)`] : [];
    });

    const actionHeaderViolations = Array.from(panel.querySelectorAll('.industrial-form-section > .industrial-panel-header')).filter(isVisible).flatMap((header) => {
      const actionRow = Array.from(header.children).find((child) => child.classList.contains('industrial-action-row'));
      if (!(actionRow instanceof HTMLElement) || !isVisible(actionRow)) return [];
      const buttons = Array.from(actionRow.querySelectorAll('button')).filter(isVisible);
      if (buttons.length === 0) return [];
      const headerRect = header.getBoundingClientRect();
      const rightMost = Math.max(...buttons.map((button) => button.getBoundingClientRect().right));
      return headerRect.right - rightMost > 32 ? [`Abschnittsaktionen nicht rechtsbündig (${Math.round(headerRect.right - rightMost)}px Abstand)`] : [];
    });

    return {
      controlCount: controls.length + checkboxes.length,
      controlViolations,
      checkboxViolations,
      fieldSpacingViolations,
      actionHeaderViolations,
      horizontalOverflow: panel.scrollWidth > panel.clientWidth + 1,
    };
  });
}

async function collectDocumentationWorkspaceContract(page: Page) {
  return page.locator('.sbv-control-panel').evaluate((panel) => {
    function isVisible(element: Element): element is HTMLElement {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    }

    const controls = Array.from(panel.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea')).filter(isVisible);
    const checkboxes = Array.from(panel.querySelectorAll('input[type="checkbox"]')).filter(isVisible);
    const controlViolations = controls.flatMap((control) => {
      const style = getComputedStyle(control);
      const rect = control.getBoundingClientRect();
      const field = control.closest('.industrial-field');
      const allowedClass = control.classList.contains('industrial-input')
        || control.classList.contains('industrial-select')
        || control.classList.contains('industrial-textarea-input');
      const problems: string[] = [];
      if (!field) problems.push('nicht in .industrial-field');
      if (!allowedClass) problems.push('kein zentrales Industrial-Control');
      if ((Number.parseFloat(style.borderTopWidth) || 0) < 1) problems.push('kein sichtbarer Rahmen');
      if (style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0, 0, 0, 0)') problems.push('transparenter Control-Hintergrund');
      if (rect.height < 32) problems.push(`zu geringe Höhe ${Math.round(rect.height)}px`);
      return problems.map((problem) => `${control.tagName.toLowerCase()}[${control.getAttribute('aria-label') ?? control.getAttribute('name') ?? control.id ?? ''}]: ${problem}`);
    });

    const checkboxViolations = checkboxes.flatMap((checkbox) => {
      const field = checkbox.closest('.industrial-checkbox-field');
      return field ? [] : ['Checkbox nutzt nicht das zentrale CheckboxField'];
    });

    const fieldSpacingViolations = Array.from(panel.querySelectorAll('.industrial-field')).filter(isVisible).flatMap((field) => {
      const control = field.querySelector('input, select, textarea');
      if (!(control instanceof HTMLElement)) return [];
      const gap = Number.parseFloat(getComputedStyle(field).rowGap) || 0;
      const label = field.querySelector('.industrial-field-label-text')?.textContent?.trim() || control.getAttribute('aria-label') || control.id || control.tagName.toLowerCase();
      return gap < 4 ? [`${label}: Label und Control ohne ausreichenden Grid-Abstand (${gap}px)`] : [];
    });

    const actionHeaderViolations = Array.from(panel.querySelectorAll('.sbv-control-section-heading-with-actions')).filter(isVisible).flatMap((header) => {
      const buttons = Array.from(header.querySelectorAll('button')).filter(isVisible);
      if (buttons.length === 0) return [];
      const headerRect = header.getBoundingClientRect();
      const rightMost = Math.max(...buttons.map((button) => button.getBoundingClientRect().right));
      return headerRect.right - rightMost > 32 ? [`Aktionen nicht rechtsbündig (${Math.round(headerRect.right - rightMost)}px Abstand)`] : [];
    });

    const helpButton = panel.querySelector('[data-e2e="industrial-help-button"]');
    const panelRect = panel.getBoundingClientRect();
    const helpRect = helpButton instanceof HTMLElement ? helpButton.getBoundingClientRect() : null;

    return {
      controlCount: controls.length + checkboxes.length,
      controlViolations,
      checkboxViolations,
      fieldSpacingViolations,
      actionHeaderViolations,
      horizontalOverflow: panel.scrollWidth > panel.clientWidth + 1,
      helpButtonVisible: helpButton instanceof HTMLElement && isVisible(helpButton),
      helpButtonRightGap: helpRect ? Math.round(panelRect.right - helpRect.right) : null,
    };
  });
}


async function collectModuleLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    function toPx(value: string): number {
      return Number.parseFloat(value) || 0;
    }

    const moduleFrame = document.querySelector<HTMLElement>('.module-frame');
    const hero = moduleFrame?.querySelector<HTMLElement>('.industrial-hero') ?? null;
    const workbenchPage = moduleFrame?.querySelector<HTMLElement>('.workbench-page') ?? null;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.industrial-form-section'));

    const heroStyle = hero ? getComputedStyle(hero) : null;
    const pageStyle = workbenchPage ? getComputedStyle(workbenchPage) : null;
    const firstSectionStyle = sections[0] ? getComputedStyle(sections[0]) : null;

    return {
      hasModuleFrame: Boolean(moduleFrame),
      hasHero: Boolean(hero),
      heroPaddingBlock: heroStyle ? Math.round(toPx(heroStyle.paddingTop) + toPx(heroStyle.paddingBottom)) : null,
      workbenchGap: pageStyle ? Math.round(toPx(pageStyle.gap || pageStyle.rowGap)) : null,
      sectionPaddingBlock: firstSectionStyle ? Math.round(toPx(firstSectionStyle.paddingTop) + toPx(firstSectionStyle.paddingBottom)) : null,
    };
  });
}

async function collectVisualSamples(page: Page) {
  return page.evaluate(visualProbeScript, {
    surfaceSelectors: VISUAL_QA_SURFACE_SELECTORS,
    badgeSelectors: VISUAL_QA_BADGE_SELECTORS,
    controlSelectors: VISUAL_QA_CONTROL_SELECTORS,
  });
}

test.describe.configure({ mode: 'parallel' });

test.describe('P11 visual contract across light and dark mode', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const route of VISUAL_QA_ROUTES) {
      test(`${theme}/${route.id}: Industrial-Visual-Vertrag`, async ({ page }) => {
        await setTheme(page, theme);
        await openRoute(page, route.navName);
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();

        const samples = await collectVisualSamples(page);
        const surfaceViolations = samples.surfaces.filter((sample) =>
          theme === 'light' ? isLightModeDarkFallback(sample) : isDarkModeLightLeak(sample),
        );
        const contrastViolations = samples.surfaces.filter((sample) => !isReadableSurfaceContrast(sample));
        const badgeViolations = samples.badges.filter((sample) => isRoundedLegacyPill(sample.radiusPx));
        const controlViolations = theme === 'light'
          ? samples.controls.filter((sample) => sample.backgroundLuminance < 170 || !isReadableSurfaceContrast(sample, 38))
          : [];

        expect(surfaceViolations, `${theme}/${route.id}: keine falschen Theme-Flächen`).toEqual([]);
        expect(contrastViolations, `${theme}/${route.id}: zentrale Flächen bleiben lesbar`).toEqual([]);
        expect(badgeViolations, `${theme}/${route.id}: keine runden Legacy-Pill-Badges`).toEqual([]);
        expect(controlViolations, `${theme}/${route.id}: Controls behalten Industrial-Chrome`).toEqual([]);
      });
    }
  }

  test('Kurzbefehle-Dialog ist in beiden Themes integriert', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await test.step(theme, async () => {
        await setTheme(page, theme);
        await page.keyboard.press(shortcutForHelp());
        const dialog = page.getByRole('dialog', { name: /Kurzbefehle/i });
        await expect(dialog).toBeVisible();
        await expect(page.getByLabel(/Kurzbefehle durchsuchen/)).toBeFocused();

        const samples = await collectVisualSamples(page);
        const modalViolations = samples.surfaces.filter((sample) =>
          /text-command-help|industrial-modal/.test(sample.className)
          && (theme === 'light' ? isLightModeDarkFallback(sample) : isDarkModeLightLeak(sample)),
        );
        const badgeViolations = samples.badges.filter((sample) => isRoundedLegacyPill(sample.radiusPx));
        expect(modalViolations, `${theme}: Kurzbefehle-Dialog ist kein visueller Fremdkörper`).toEqual([]);
        expect(badgeViolations, `${theme}: Kurzbefehle-Dialog nutzt kantige Badges/Chips`).toEqual([]);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      });
    }
  });
});

test.describe('0.9.5-k HelpDialog visual contract', () => {
  const helpRoutes = VISUAL_QA_ROUTES.filter((candidate) => isHelpDialogQaRoute(candidate.id));
  for (const theme of ['light', 'dark'] as const) {
    for (const route of helpRoutes) {
      test(`${theme}/${route.id}: Hilfe-Dialog`, async ({ page }) => {
        await setTheme(page, theme);
        await openRoute(page, route.navName);
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();

        const helpButton = page.locator('[data-e2e="industrial-help-button"]').first();
        await expect(helpButton).toBeVisible();
        await helpButton.click();
        const dialog = page.locator('[data-e2e="industrial-help-dialog"]');
        await expect(dialog).toBeVisible();

        const samples = await collectVisualSamples(page);
        const helpDialogViolations = samples.surfaces.filter((sample) =>
          /industrial-help-dialog|industrial-modal/.test(sample.className)
          && (theme === 'light' ? isLightModeDarkFallback(sample) : isDarkModeLightLeak(sample)),
        );
        const contrastViolations = samples.surfaces.filter((sample) =>
          /industrial-help-dialog|industrial-modal/.test(sample.className) && !isReadableSurfaceContrast(sample),
        );
        expect(helpDialogViolations, `${theme}/${route.id}: Hilfe-Dialog nutzt keine falschen Theme-Flächen`).toEqual([]);
        expect(contrastViolations, `${theme}/${route.id}: Hilfe-Dialog bleibt lesbar`).toEqual([]);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      });
    }
  }
});

test.describe('0.9.5-l Modul-Layout-Konsistenz', () => {
  for (const route of WORKBENCH_LAYOUT_QA_ROUTES.filter((candidate) => candidate.id !== 'dashboard')) {
    test(`${route.id}: gemeinsames Workbench-Abstandsmuster`, async ({ page }) => {
      await setTheme(page, 'light');
      await openRoute(page, route.navName);
      const moduleFrame = page.locator('.module-frame').filter({
        has: page.getByRole('heading', { name: route.heading }),
      });
      await expect(moduleFrame).toBeVisible();

      const metrics = await collectModuleLayoutMetrics(page);
      expect(metrics.hasModuleFrame, `${route.id}: nutzt ModuleFrame`).toBe(true);
      expect(metrics.hasHero, `${route.id}: nutzt Industrial-Hero`).toBe(true);
      expect(metrics.heroPaddingBlock).toBeGreaterThanOrEqual(24);
      expect(metrics.heroPaddingBlock).toBeLessThanOrEqual(44);
      if (metrics.workbenchGap !== null) {
        expect(metrics.workbenchGap).toBeGreaterThanOrEqual(12);
        expect(metrics.workbenchGap).toBeLessThanOrEqual(28);
      }
      if (metrics.sectionPaddingBlock !== null) {
        expect(metrics.sectionPaddingBlock).toBeGreaterThanOrEqual(24);
        expect(metrics.sectionPaddingBlock).toBeLessThanOrEqual(48);
      }
    });
  }
});

test.describe('Lifecycle- und Aktionskonsistenz', () => {
  test('stellt identische destruktive Listeneinstiege bei Person, Fallakte und Maßnahme gleich dar', async ({ page }) => {
    await setTheme(page, 'dark');
    await page.locator('[data-e2e="main-nav-persons"]').click();
    const personDelete = page.getByRole('button', { name: /Person löschen: Mustermann, Max/ });
    await expect(personDelete).toBeVisible();
    const personStyle = await personDelete.evaluate((element) => {
      const style = getComputedStyle(element);
      return { cursor: style.cursor, color: style.color, borderColor: style.borderTopColor, backgroundColor: style.backgroundColor, borderRadius: style.borderRadius };
    });

    await page.locator('[data-e2e="main-nav-cases"]').click();
    const caseDelete = page.getByRole('button', { name: /Fallakte löschen oder anonymisieren: TEST-0001/ });
    await expect(caseDelete).toBeVisible();
    const caseStyle = await caseDelete.evaluate((element) => {
      const style = getComputedStyle(element);
      return { cursor: style.cursor, color: style.color, borderColor: style.borderTopColor, backgroundColor: style.backgroundColor, borderRadius: style.borderRadius };
    });

    await page.locator('[data-e2e="case-row-TEST-0001"]').click();
    const processDelete = page.getByRole('button', { name: 'BEM löschen', exact: true });
    await expect(processDelete).toBeVisible();
    const processStyle = await processDelete.evaluate((element) => {
      const style = getComputedStyle(element);
      return { cursor: style.cursor, color: style.color, borderColor: style.borderTopColor, backgroundColor: style.backgroundColor, borderRadius: style.borderRadius };
    });

    expect(caseStyle).toEqual(personStyle);
    expect(processStyle).toEqual(personStyle);
    expect(personStyle.cursor).toBe('pointer');
    expect(personStyle.borderRadius).toBe('0px');
  });
});

test.describe('SBV-Dokumentation – gerenderter UI-Vertrag', () => {
  const workspaces = [
    { nav: /^Gremien\b/i, title: /Sitzungen & Tagesordnung/i },
    { nav: /^Versammlung\b/i, title: /Schwerbehindertenversammlung/i },
    { nav: /^Beschwerden\b/i, title: /Anregungen und Beschwerden/i },
    { nav: /^Arbeitgeberpflichten\b/i, title: /Periodische Prüfvorgänge/i },
    { nav: /^Inklusionsvereinbarung\b/i, title: /Inklusionsvereinbarung/i },
  ] as const;
  const viewports = [
    { width: 900, height: 900 },
    { width: 1024, height: 800 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ] as const;

  for (const workspace of workspaces) {
    test(`${String(workspace.nav)}: Controls, Aktionsköpfe und Overflow`, async ({ page }) => {
      await page.setViewportSize(viewports[viewports.length - 1]);
      await setTheme(page, 'dark');
      await openRoute(page, 'Dokumentation');
      await page.getByRole('button', { name: workspace.nav }).first().click();
      const panel = page.locator('.sbv-control-panel').filter({ has: page.getByRole('heading', { name: workspace.title }) }).first();
      await expect(panel).toBeVisible();

      for (const viewport of viewports) {
        await test.step(`${viewport.width}px`, async () => {
          await page.setViewportSize(viewport);
          const contract = await collectDocumentationWorkspaceContract(page);
          expect(contract.controlCount).toBeGreaterThan(0);
          expect(contract.controlViolations).toEqual([]);
          expect(contract.checkboxViolations).toEqual([]);
          expect(contract.fieldSpacingViolations).toEqual([]);
          expect(contract.actionHeaderViolations).toEqual([]);
          expect(contract.horizontalOverflow).toBe(false);
          expect(contract.helpButtonVisible).toBe(true);
          expect(contract.helpButtonRightGap).not.toBeNull();
          expect(contract.helpButtonRightGap!).toBeLessThanOrEqual(32);
        });
      }
    });
  }
});

test.describe('SBV-Wahlen – gerenderter UI- und Formularvertrag', () => {
  const electionSections = [
    'Einleitung',
    'Wahlorgan',
    'Wählerliste',
    'Vorschläge',
    'Vorbereitung',
    'Stimmabgabe',
    'Briefwahl',
    'Auszählung',
    'Annahme',
    'Abschluss',
  ] as const;

  const viewports = [
    { width: 900, height: 900 },
    { width: 1024, height: 800 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ] as const;

  test('prüft den vollständigen Wahlworkflow über alle relevanten Viewports', async ({ page }) => {
    test.slow();
    await page.setViewportSize(viewports[viewports.length - 1]);
    await setTheme(page, 'dark');
      await openRoute(page, 'Wahlen');

    await page.getByRole('button', { name: 'Wahlvorgang anlegen' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Neuen Wahlvorgang anlegen' });
    await createDialog.getByLabel('Wahlart').selectOption('extraordinary_no_sbv');
    await createDialog.getByLabel('Wahlgrund').fill('UI-Vertrag');
    await createDialog.getByRole('button', { name: 'Wahlvorgang anlegen' }).click();
    await page.getByLabel('Bestätigt schwerbehindert').fill('50');
    await page.getByLabel('Verfahren', { exact: true }).selectOption('formal');
    await page.getByRole('button', { name: 'Prüfung speichern' }).click();

    const navigation = page.getByRole('navigation', { name: 'SBV-Wahl Arbeitsbereiche' });
    for (const section of electionSections) {
      await navigation.getByRole('button', { name: new RegExp(`^${section}\\b`) }).click();
      const panel = page.locator('.election-workflow-panel').first();
      await expect(panel.getByRole('heading', { name: section, exact: true })).toBeVisible();

      for (const viewport of viewports) {
        await test.step(`${section} bei ${viewport.width}px`, async () => {
          await page.setViewportSize(viewport);
          const contract = await collectIndustrialWorkspaceContract(panel);
          expect(contract.controlViolations, `${section}: sichtbare Eingaben nutzen ausschließlich IndustrialForm`).toEqual([]);
          expect(contract.checkboxViolations, `${section}: Checkboxen nutzen CheckboxField`).toEqual([]);
          expect(contract.fieldSpacingViolations, `${section}: Label und Controls besitzen sichtbaren Abstand`).toEqual([]);
          expect(contract.actionHeaderViolations, `${section}: Abschnittsaktionen stehen rechts im Kopfbereich`).toEqual([]);
          expect(contract.horizontalOverflow, `${section}: kein horizontaler Workflow-Overflow`).toBe(false);
        });
      }
    }
  });
});

test('Gleichstellungs-/GdB-Erstanlage nutzt die Dialogbreite ohne gequetschte Formularspalten', async ({ page }) => {
  await openRoute(page, 'Gleichstellung');
  await page.getByRole('button', { name: 'Vorgang anlegen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Gleichstellungs-/GdB-Vorgang anlegen' });
  await expect(dialog).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const controls = Array.from(element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'))
      .filter((control) => {
        const rect = control.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((control) => control.getBoundingClientRect());
    return {
      horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
      minimumControlWidth: Math.min(...controls.map((rect) => rect.width)),
      controlsInsideDialog: controls.every((rect) => rect.left >= element.getBoundingClientRect().left && rect.right <= element.getBoundingClientRect().right),
    };
  });

  expect(geometry.horizontalOverflow).toBe(false);
  expect(geometry.minimumControlWidth).toBeGreaterThanOrEqual(220);
  expect(geometry.controlsInsideDialog).toBe(true);
});
