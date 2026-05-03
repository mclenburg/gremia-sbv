import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.8a export guard import fix", () => {
  it("imports scanBemProcessExport where the BEM document export uses it", () => {
    const source = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(source).toContain("scanBemProcessExport");
    expect(source).toContain("from '@services/exportGuardPolicy'");
    expect(source).toContain("buildExportWarningMessage, scanBemProcessExport, scanSensitiveExportText");
  });
});
