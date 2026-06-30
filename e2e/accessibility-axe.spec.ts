import type { Page } from '@playwright/test';
import { VISUAL_QA_ROUTES, isHelpDialogQaRoute, type VisualTheme } from '../src/app/shared/theme/visualQa';
import { requireE2eTool } from './support/e2eToolResolver';
import { test, expect } from './support/test';

type AxeBuilderConstructor = {
  new (options: { page: Page }): {
    withTags(tags: string[]): {
      disableRules(rules: string[]): {
        exclude(selector: string): {
          analyze(): Promise<{ violations: AxeViolation[] }>;
        };
      };
    };
  };
};

const axeModule = requireE2eTool('@axe-core/playwright') as { default?: AxeBuilderConstructor } | AxeBuilderConstructor;
const AxeBuilder = ('default' in axeModule ? axeModule.default : axeModule) as AxeBuilderConstructor;

type AxeViolation = {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl: string;
  nodes: Array<{ target: string[]; failureSummary?: string | null }>;
};

const SERIOUS_IMPACTS = new Set(['serious', 'critical']);

function shortcutForHelp() {
  return process.platform === 'darwin' ? 'Meta+H' : 'Control+H';
}

async function setTheme(page: Page, theme: VisualTheme) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('gremia.sbv.theme', value);
    window.localStorage.setItem('gremia-sbv-theme', value);
    document.documentElement.dataset.theme = value;
  }, theme);
}

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openRoute(page: Page, navName: string) {
  await mainNavigation(page).getByRole('button', { name: navName, exact: true }).click();
}

function describeViolations(violations: AxeViolation[]) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 5)
        .map((node) => `    - ${node.target.join(' ')}: ${node.failureSummary ?? 'keine Details'}`)
        .join('\n');
      return `${violation.id} [${violation.impact ?? 'unknown'}] ${violation.help}\n  ${violation.helpUrl}\n${nodes}`;
    })
    .join('\n\n');
}

async function expectNoSeriousAxeViolations(page: Page, contextLabel: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Farbkontraste werden bereits durch das eigene Visual-QA-Gate über Light/Dark-Samples überwacht.
    // Dieses Axe-Gate fokussiert strukturelle WCAG-Verstöße, ARIA, Labels, Rollen und Landmarken.
    .disableRules(['color-contrast'])
    .exclude('.industrial-live-region')
    .analyze();

  const blockingViolations = results.violations.filter((violation) => SERIOUS_IMPACTS.has(violation.impact ?? ''));
  expect(blockingViolations, `${contextLabel}: keine serious/critical Axe-WCAG-Verstöße\n${describeViolations(blockingViolations)}`).toEqual([]);
}

test.describe('P15m Axe accessibility scan', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const route of VISUAL_QA_ROUTES) {
      test(`keeps ${route.id} free of serious Axe violations in ${theme} mode`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto('/');
        await expect(mainNavigation(page)).toBeVisible();

        await openRoute(page, route.navName);
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
        await expectNoSeriousAxeViolations(page, `${theme}/${route.id}`);
      });
    }
  }

  test('keeps the inline command help dialog free of serious Axe violations', async ({ page }) => {
    await setTheme(page, 'light');
    await page.goto('/');
    await page.keyboard.press(shortcutForHelp());

    const dialog = page.getByRole('dialog', { name: /Kurzbefehle/i });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel(/Kurzbefehle durchsuchen/)).toBeFocused();
    await expectNoSeriousAxeViolations(page, 'inline-command-help-dialog');
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const route of VISUAL_QA_ROUTES.filter((candidate) => isHelpDialogQaRoute(candidate.id))) {
      test(`keeps ${route.id} help dialog free of serious Axe violations in ${theme} mode`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto('/');
        await expect(mainNavigation(page)).toBeVisible();

        await openRoute(page, route.navName);
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();

        const helpButton = page.locator('[data-e2e="industrial-help-button"]').first();
        await expect(helpButton).toBeVisible();
        await helpButton.click();
        await expect(page.locator('[data-e2e="industrial-help-dialog"]')).toBeVisible();

        await expectNoSeriousAxeViolations(page, `${theme}/${route.id}/help-dialog`);
      });
    }
  }

});
