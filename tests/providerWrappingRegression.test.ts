import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("provider wrapping regression", () => {
  it("does not close LiveRegionProvider before the App component", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const appStart = app.indexOf("export function App()");
    const beforeApp = app.slice(0, appStart);
    expect(beforeApp).not.toContain("</ConfirmDialogProvider>");
    expect(beforeApp).not.toContain("</LiveRegionProvider>");
  });

  it("wraps only the unlocked App shell with providers", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const appStart = app.indexOf("export function App()");
    const appPart = app.slice(appStart);
    expect(appPart).toContain("<LiveRegionProvider>");
    expect(appPart).toContain("<ConfirmDialogProvider>");
    expect(appPart).toContain("</ConfirmDialogProvider>");
    expect(appPart).toContain("</LiveRegionProvider>");
    expect(appPart.indexOf("<LiveRegionProvider>")).toBeLessThan(appPart.indexOf('<main className="industrial-shell'));
    expect(appPart.indexOf("</ConfirmDialogProvider>")).toBeGreaterThan(appPart.indexOf("</main>"));
  });
});
