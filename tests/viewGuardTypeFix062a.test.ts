import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.2a implemented view id type fix", () => {
  it("does not include usb in IMPLEMENTED_VIEW_IDS because usb is not a ViewId", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(app).toContain("const IMPLEMENTED_VIEW_IDS = new Set<ViewId>");
    expect(app).toContain("'equalization'");
    expect(app).not.toContain("'usb'");
  });
});
