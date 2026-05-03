import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".tsx") || full.endsWith(".ts") ? [full] : [];
  });
}

describe("0.5.3 global text command controller", () => {
  it("mounts a global inline-command controller with case and contact context", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(app).toContain("GlobalTextCommandController");
    expect(app).toContain("<GlobalTextCommandController cases={cases} contacts={contacts} />");
  });

  it("lets TextCommandTextarea replace markers by fieldId", () => {
    const source = readFileSync("src/app/shared/textCommands/TextCommandTextarea.tsx", "utf8");

    expect(source).toContain("gremia-sbv:text-command-replace");
    expect(source).toContain("TextCommandTextareaReplacement");
    expect(source).toContain("detail.fieldId !== fieldId");
    expect(source).toContain("textarea.dispatchEvent(new Event('input', { bubbles: true }))");
  });

  it("implements all inline tokens in the global controller", () => {
    const source = readFileSync("src/app/shared/textCommands/GlobalTextCommandController.tsx", "utf8");

    for (const token of ["//", "@@", "##", "§§", "!!", ">>", "^^", "~~"]) {
      expect(source).toContain(`draft.token === '${token}'`);
    }
    expect(source).toContain("formatCaseReferenceText");
    expect(source).toContain("formatContactReferenceText");
    expect(source).toContain("formatLegalNormText");
  });

  it("does not display command hints without a global or local command path", () => {
    const textareas = sourceFiles("src")
      .filter((file) => readFileSync(file, "utf8").includes("TextCommandTextarea"))
      .join("\n");

    expect(textareas).toContain("globalCommandsEnabled={false}");
    expect(textareas).toContain("fieldId=\"bem-trigger-description\"");
    expect(textareas).not.toContain("showCommandHint={false} fieldId=\"bem-trigger-description\"");
  });
});
