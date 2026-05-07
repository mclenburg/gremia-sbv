import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const movedFromCases = [
  "BackupRestoreForm.tsx",
  "ChangePasswordForm.tsx",
  "RetentionSettingsPanel.tsx",
  "TemporaryFilesSettingsPanel.tsx",
  "ThemeSettingsForm.tsx",
  "TemplateDefaultSettingsForm.tsx",
  "SettingsView.tsx",
  "DashboardOverview.tsx",
  "passwordValidation.ts",
  "casesViewTheme.ts",
];

describe("RC feature module boundaries", () => {
  it("keeps dashboard and settings modules out of the cases feature", () => {
    for (const fileName of movedFromCases) {
      expect(
        existsSync(`src/app/features/cases/${fileName}`),
        `${fileName} must not live under features/cases`,
      ).toBe(false);
    }

    expect(existsSync("src/app/features/dashboard/DashboardOverview.tsx")).toBe(true);
    expect(existsSync("src/app/features/settings/SettingsView.tsx")).toBe(true);
    expect(existsSync("src/app/shared/theme/appTheme.ts")).toBe(true);
  });

  it("keeps workflowViews as a pure public compatibility index", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain('from "./features/cases/CasesView"');
    expect(workflow).toContain('from "./features/dashboard/DashboardOverview"');
    expect(workflow).toContain('from "./features/settings/SettingsView"');
    expect(workflow).toContain('from "./shared/theme/appTheme"');
    expect(workflow).not.toContain('from "./features/cases/SettingsView"');
    expect(workflow).not.toContain('from "./features/cases/DashboardOverview"');
  });
});
