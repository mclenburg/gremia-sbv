import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.2 view guard and prevention live region", () => {
  it("uses a set-based implemented-view guard instead of a fragile negation chain", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(app).toContain("const IMPLEMENTED_VIEW_IDS = new Set<ViewId>");
    expect(app).toContain("'equalization'");
    expect(app).toContain("function isImplementedView");
    expect(app).toContain("{!isImplementedView(currentView) && currentModule");
    expect(app).not.toContain("currentView !== 'dashboard' && currentView !== 'cases'");
  });

  it("announces PreventionView loading results and errors through the live region", () => {
    const source = readFileSync("src/app/features/prevention/PreventionView.tsx", "utf8");

    expect(source).toContain("useAnnouncer");
    expect(source).toContain("announce(error, 'assertive')");
    expect(source).toContain("Präventionsverfahren geladen");
    expect(source).toContain("Präventionsverfahren werden geladen");
  });
});
