import { describe, expect, it } from "vitest";
import { readNormalizedSourceText } from "./helpers/sourceText";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cssRulesForSelector(source: string, selector: string): string[] {
  const escapedSelector = escapeRegExp(selector);
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  const matches: string[] = [];

  for (const match of source.matchAll(rulePattern)) {
    const selectorList = match[1]
      .split(",")
      .map((part) => part.trim());

    if (selectorList.includes(selector)) {
      matches.push(match[0]);
      continue;
    }

    if (selectorList.some((part) => new RegExp(`(^|\\s)${escapedSelector}($|\\s|:)`).test(part))) {
      matches.push(match[0]);
    }
  }

  return matches;
}

function expectAnyRuleContains(source: string, selector: string, declaration: string): void {
  const rules = cssRulesForSelector(source, selector);

  expect(rules, `${selector} muss mindestens eine CSS-Regel haben.`).not.toHaveLength(0);
  expect(
    rules.some((rule) => rule.includes(declaration)),
    `${selector} muss die Deklaration "${declaration}" enthalten.`,
  ).toBe(true);
}

describe("Compliance-Selfcheck Layout", () => {
  it("haelt Statuskacheln in einem responsiven Grid innerhalb der Box", () => {
    const css = readNormalizedSourceText("src/app/ui/components.css");
    const panel = readNormalizedSourceText(
      "src/app/features/compliance/components/ComplianceSelfCheckPanel.tsx",
    );
    const gridRules = cssRulesForSelector(css, ".industrial-status-grid");

    expect(panel).toContain('className="industrial-status-grid"');
    expect(gridRules).not.toHaveLength(0);
    expect(
      gridRules.some((rule) =>
        /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*16rem\),\s*1fr\)\)/.test(rule),
      ),
    ).toBe(true);
    expectAnyRuleContains(css, ".industrial-status-grid", "width: 100%");
    expectAnyRuleContains(css, ".industrial-status-grid", "max-width: 100%");
    expectAnyRuleContains(css, ".industrial-status-grid", "min-width: 0");
    expectAnyRuleContains(css, ".industrial-status-card", "max-width: 100%");
    expectAnyRuleContains(css, ".industrial-status-card", "overflow-wrap: anywhere");
  });

  it("verhindert Kachelsprenger durch Header- und Badge-Layout", () => {
    const css = readNormalizedSourceText("src/app/ui/components.css");

    expectAnyRuleContains(css, ".industrial-status-card-header", "min-width: 0");
    expectAnyRuleContains(css, ".industrial-status-card-header", "max-width: 100%");
    expectAnyRuleContains(css, ".industrial-status-card-header h3", "min-width: 0");
    expectAnyRuleContains(css, ".industrial-status-card-header h3", "overflow-wrap: anywhere");
    expectAnyRuleContains(
      css,
      ".industrial-status-card-header .industrial-status-badge",
      "flex: 0 0 auto",
    );
    expect(css).not.toMatch(/\.industrial-status-grid\s*\{[^}]*overflow-x:\s*auto/);
  });
});
