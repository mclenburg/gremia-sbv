import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.57 accessibility and keyboard contracts", () => {
  it("provides live regions for polite and assertive messages", () => {
    const live = readFileSync("src/app/shared/a11y/LiveRegionProvider.tsx", "utf8");

    expect(live).toContain("aria-live=\"polite\"");
    expect(live).toContain("aria-live=\"assertive\"");
    expect(live).toContain("aria-atomic=\"true\"");
  });

  it("keeps confirm dialogs accessible and dismissible", () => {
    const confirm = readFileSync("src/app/shared/dialogs/ConfirmDialogProvider.tsx", "utf8");

    expect(confirm).toContain("aria-modal=\"true\"");
    expect(confirm).toContain("Escape");
    expect(confirm).toContain("cancelButtonRef");
  });

  it("uses accessible modals for case and template workflows", () => {
    for (const file of [
      "src/app/features/cases/CaseNoteModal.tsx",
      "src/app/features/cases/CaseCreateModal.tsx",
      "src/app/features/cases/CaseProcessDraftModal.tsx",
      "src/app/features/templates/TemplatesView.tsx"
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toMatch(/role=\"dialog\"|aria-modal=\"true\"/);
    }
  });

  it("keeps large text fields command-enabled for keyboard-only workflows", () => {
    const textarea = readFileSync("src/app/shared/textCommands/TextCommandTextarea.tsx", "utf8");

    expect(textarea).toContain("data-text-command-enabled");
    expect(textarea).toContain("aria-describedby");
    expect(textarea).toContain("TEXT_COMMAND_HINT");
  });
});
