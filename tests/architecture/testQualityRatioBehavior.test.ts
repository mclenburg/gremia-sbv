import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { classifyFile, summarizeTestQuality } = require("../../scripts/lib/test-quality-metrics.cjs") as {
  classifyFile: (file: string, source: string) => {
    category: "behavior" | "hybrid" | "source_inspection";
    assertionCount: number;
    sourceAssertionCount: number;
  };
  summarizeTestQuality: (files: Array<{
    file: string;
    category: "behavior" | "hybrid" | "source_inspection";
    readsProjectSource: boolean;
    importsProductionCode: boolean;
    assertionCount: number;
    sourceAssertionCount: number;
  }>) => { assertions: number; sourceAssertions: number; sourceAssertionRatio: number };
};

describe("Testqualitätsmetrik für echte Quelltext-Stringtests", () => {
  it("zählt einen Matcher auf eingelesenem Produktivquelltext als Stringtest", () => {
    const result = classifyFile("tests/source.test.ts", `
      import { readFileSync } from "node:fs";
      const source = readFileSync("src/example.ts", "utf8");
      expect(source).toContain("export function example");
      expect(source).not.toMatch(/eval\\s*\\(/);
    `);

    expect(result.category).toBe("source_inspection");
    expect(result.assertionCount).toBe(2);
    expect(result.sourceAssertionCount).toBe(2);
  });

  it("verfolgt aus Quelltext abgeleitete Variablen", () => {
    const result = classifyFile("tests/derived.test.ts", `
      import { readFileSync } from "node:fs";
      const raw = readFileSync("src/example.ts", "utf8");
      const normalized = raw.replaceAll("\\r\\n", "\\n");
      expect(normalized).toContain("export");
    `);

    expect(result.sourceAssertionCount).toBe(1);
  });

  it("zählt fachliche String-Assertions auf Laufzeitergebnissen nicht als Quelltexttests", () => {
    const result = classifyFile("tests/behavior.test.ts", `
      import { renderTemplate } from "../services/templateService";
      const rendered = renderTemplate({ name: "Anna" });
      expect(rendered).toContain("Anna");
      expect(rendered).toMatch(/Anna/);
    `);

    expect(result.category).toBe("behavior");
    expect(result.assertionCount).toBe(2);
    expect(result.sourceAssertionCount).toBe(0);
  });

  it("berechnet die harte Quote auf Assertions und nicht auf Dateien", () => {
    const summary = summarizeTestQuality([
      { file: "a", category: "source_inspection", readsProjectSource: true, importsProductionCode: false, assertionCount: 10, sourceAssertionCount: 1 },
      { file: "b", category: "behavior", readsProjectSource: false, importsProductionCode: true, assertionCount: 90, sourceAssertionCount: 0 },
    ]);

    expect(summary.assertions).toBe(100);
    expect(summary.sourceAssertions).toBe(1);
    expect(summary.sourceAssertionRatio).toBe(0.01);
  });
});
