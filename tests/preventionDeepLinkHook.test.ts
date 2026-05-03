import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("prevention deep link hook", () => {
  it("declares openCaseNode inside the App component scope", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const appStart = app.indexOf("export function App()");
    const appReturn = app.indexOf("\n  return (", appStart);
    const appPrefix = app.slice(appStart, appReturn);
    expect(appPrefix).toContain("function openCaseNode(target: CaseNodeTarget)");
    expect(appPrefix).toContain("setCaseNodeTarget(target)");
    expect(appPrefix).toContain("setCurrentView('cases')");
  });

  it("passes the deep link hook to PreventionView", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("<PreventionView cases={cases} onOpenCaseNode={openCaseNode} />");
  });
});
