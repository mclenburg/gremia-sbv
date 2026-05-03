import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("accessible confirm dialogs and live regions", () => {
  it("removes native window.confirm from App.tsx", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).not.toContain("window.confirm");
    expect(app).toContain("useConfirmDialog");
    expect(app).toContain("ConfirmDialogProvider");
  });

  it("provides an accessible alertdialog implementation", () => {
    const dialog = readFileSync("src/app/shared/dialogs/ConfirmDialogProvider.tsx", "utf8");
    expect(dialog).toContain('role="alertdialog"');
    expect(dialog).toContain("aria-labelledby");
    expect(dialog).toContain("aria-describedby");
    expect(dialog).toContain("Escape");
  });

  it("adds global live regions for polite and assertive announcements", () => {
    const live = readFileSync("src/app/shared/a11y/LiveRegionProvider.tsx", "utf8");
    expect(live).toContain('role="status"');
    expect(live).toContain('aria-live="polite"');
    expect(live).toContain('role="alert"');
    expect(live).toContain('aria-live="assertive"');
  });

  it("wraps the unlocked app with providers", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("<LiveRegionProvider>");
    expect(app).toContain("<ConfirmDialogProvider>");
  });
});
