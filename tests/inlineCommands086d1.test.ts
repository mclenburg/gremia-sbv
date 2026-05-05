import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("0.8.6-d.1 inline command build fix", () => {
  it("uses a local non-null draft in applyPrimaryAction", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/shared/textCommands/GlobalTextCommandController.tsx"),
      "utf8",
    );

    expect(source).toContain("const currentDraft = draft;");
    expect(source).toContain("if (!currentDraft) return;");
    expect(source).toContain("function replaceAndClose(currentDraft: GlobalDraft, replacement: string)");
    expect(source).not.toContain("function replaceAndClose(replacement: string)");
  });
});
