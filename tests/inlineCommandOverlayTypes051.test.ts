import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.1 inline command overlay types", () => {
  it("removes any from InlineCommandOverlays props and updater callbacks", () => {
    const source = readFileSync("src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx", "utf8");

    expect(source).toContain("InlineCaseLinkDraft | null");
    expect(source).toContain("InlineDeadlineDraft | null");
    expect(source).toContain("cases: CaseRecord[]");
    expect(source).toContain("contacts: ContactRecord[]");
    expect(source).toContain("insertLegalNormFromProtocol: (norm: LegalNormSuggestion)");
    expect(source).not.toContain(": any");
    expect(source).not.toContain("any[]");
    expect(source).not.toContain("current: any");
  });
});
