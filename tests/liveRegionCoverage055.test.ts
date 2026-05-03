import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.5 live region coverage", () => {
  it("announces BEM overview loading and errors", () => {
    const source = readFileSync("src/app/features/bem/BemView.tsx", "utf8");

    expect(source).toContain("useAnnouncer");
    expect(source).toContain("if (error) announce(error, 'assertive')");
    expect(source).toContain("BEM-Verfahren geladen");
  });

  it("announces case note modal success and error messages", () => {
    const source = readFileSync("src/app/features/cases/CaseNoteModal.tsx", "utf8");

    expect(source).toContain("useAnnouncer");
    expect(source).toContain("if (!open || !noteError) return;");
    expect(source).toContain("announce(noteError, 'assertive')");
    expect(source).toContain("announce(noteInfo, 'polite')");
  });

  it("announces knowledge workbench success and error messages", () => {
    const source = readFileSync("src/app/features/knowledge/KnowledgeView.tsx", "utf8");

    expect(source).toContain("useAnnouncer");
    expect(source).toContain("if (error) announce(error, 'assertive')");
    expect(source).toContain("if (message) announce(message, 'polite')");
  });
});
