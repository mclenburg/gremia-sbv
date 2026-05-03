import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.1c BEM UI and command hints", () => {
  it("uses the primary fall-action design for the active BEM module button", () => {
    const footer = readFileSync("src/app/features/cases/CaseWorkbenchFooter.tsx", "utf8");

    expect(footer).toContain("HeartPulse");
    expect(footer).toContain("className=\"industrial-button\" disabled={disabled} onClick={() => onProcess('bem')}");
    expect(footer).not.toContain("className=\"industrial-secondary-button\" disabled={disabled} onClick={() => onProcess('bem')}>BEM</button>");
  });

  it("allows text command hints to be hidden for fields without wired command overlays", () => {
    const textarea = readFileSync("src/app/shared/textCommands/TextCommandTextarea.tsx", "utf8");

    expect(textarea).toContain("showCommandHint?: boolean");
    expect(textarea).toContain("showCommandHint = true");
    expect(textarea).toContain("showCommandHint ? (placeholder");
  });

  it("advertises inline commands in BEM detail fields after global overlay wiring", () => {
    const bem = readFileSync("src/app/features/bem/BemProcessDetail.tsx", "utf8");

    expect(bem).toContain("fieldId=\"bem-trigger-description\"");
    expect(bem).toContain("fieldId=\"bem-measures\"");
    expect(bem).toContain("fieldId=\"bem-result\"");
    expect(bem).toContain("fieldId=\"bem-confidential-notes\"");
    expect(bem).not.toContain("showCommandHint={false}");
  });
});
