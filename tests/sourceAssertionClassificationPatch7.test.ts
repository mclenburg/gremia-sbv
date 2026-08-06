import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Classification = {
  file: string;
  category: "A" | "B" | "C";
  sourceAssertions: number;
  rationale: string;
};

describe("Source-Assertion-Klassifikation", () => {
  const manifest = JSON.parse(readFileSync("maintenance/test-quality/source-assertion-classification.json", "utf8")) as { entries: Classification[] };

  it("enthält nur begründete, eindeutige Klassifikationen", () => {
    expect(new Set(manifest.entries.map((entry) => entry.file)).size).toBe(manifest.entries.length);
    expect(manifest.entries.every((entry) => ["A", "B", "C"].includes(entry.category))).toBe(true);
    expect(manifest.entries.every((entry) => entry.sourceAssertions > 0 && entry.rationale.trim().length > 20)).toBe(true);
  });

  it("enthält keine unerledigte Kategorie C", () => {
    expect(manifest.entries.filter((entry) => entry.category === "C")).toEqual([]);
  });
});
