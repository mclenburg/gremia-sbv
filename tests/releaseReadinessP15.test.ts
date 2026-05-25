import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const lines = (path: string) => read(path).split(/\r?\n/).length;

function filesUnder(dir: string, suffixes = [".ts", ".tsx"]): string[] {
  const result: string[] = [];
  function visit(path: string) {
    for (const entry of readdirSync(join(root, path))) {
      const child = `${path}/${entry}`;
      const absolute = join(root, child);
      if (statSync(absolute).isDirectory()) visit(child);
      else if (suffixes.some((suffix) => child.endsWith(suffix))) result.push(child);
    }
  }
  visit(dir);
  return result;
}

describe("P15 Release-Readiness", () => {
  it("dokumentiert die 1.0-Gates als verbindliche Release-Checkliste", () => {
    expect(existsSync(join(root, "docs/QUALITY_GATE_1_0.md"))).toBe(true);
    const checklist = read("docs/QUALITY_GATE_1_0.md");
    for (const required of [
      "offline-first",
      "Architektur-Gates",
      "Accessibility-Gates",
      "npm run build",
      "test:e2e:visual",
      "test:e2e:core-ui-flows",
      "test:e2e:complete-tour",
      "Community-Beiträge",
    ]) {
      expect(checklist).toContain(required);
    }
  });

  it("hält die refactorierten Orchestrierungs-Views dünn", () => {
    const thinViews = [
      "src/app/features/compliance/ComplianceView.tsx",
      "src/app/features/sbv-control/SbvControlView.tsx",
      "src/app/features/knowledge/KnowledgeView.tsx",
      "src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx",
    ];
    for (const file of thinViews) {
      expect(lines(file), `${file} ist nicht mehr dünn genug`).toBeLessThan(260);
    }
  });

  it("verteilt Inline-Command-Zuständigkeiten auf eigene Module statt alles im Hook zu halten", () => {
    for (const file of [
      "src/app/features/cases/inlineCommands/inlineCommandTypes.ts",
      "src/app/features/cases/inlineCommands/inlineCommandText.ts",
      "src/app/features/cases/inlineCommands/inlineCommandOpeners.ts",
      "src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx",
    ]) {
      expect(existsSync(join(root, file)), `${file} fehlt`).toBe(true);
    }
    const hook = read("src/app/features/cases/inlineCommands/useInlineCommands.ts");
    expect(hook).toContain("openInlineCommandDraft");
    expect(hook).not.toContain("buildBemPrefill");
    expect(hook).not.toContain("export type InlineBemDraft =");
  });

  it("kennt die finalen Release-QA-Dokumente", () => {
    for (const file of [
      "docs/UI_VISUAL_QA.md",
      "docs/UI_CORE_BEHAVIOR_QA.md",
      "docs/ARCHITECTURE.md",
      "CONTRIBUTING.md",
      "README.md",
    ]) {
      expect(existsSync(join(root, file)), `${file} fehlt`).toBe(true);
    }
  });

  it("verhindert neue Feature-CSS-Dateien als Community-Vorbild", () => {
    const featureCss = filesUnder("src/app/features", [".css"]);
    expect(featureCss).toEqual([]);
  });

  it("bindet eine vollständige synthetische Produkttour als E2E-Releasegate ein", () => {
    const e2e = read("e2e/app-complete-tour.spec.ts");
    const pkg = read("package.json");
    expect(e2e).toContain("complete synthetic 1.0 product tour");
    expect(e2e).toContain("VISUAL_QA_ROUTES");
    expect(e2e).toContain("Kontakt speichern");
    expect(e2e).toContain("Rechtsbezug setzen");
    expect(e2e).toContain("PDF erzeugen");
    expect(pkg).toContain("test:e2e:complete-tour");
  });

});
