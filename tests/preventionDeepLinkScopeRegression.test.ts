import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("prevention deep link scope regression", () => {
  it("declares caseNodeTarget state and openCaseNode before App JSX return", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const appStart = app.indexOf("export function App()");
    const appReturn = app.indexOf("\n  return (", appStart);
    const appPrefix = app.slice(appStart, appReturn);

    expect(appPrefix).toContain("const [caseNodeTarget, setCaseNodeTarget] = useState<CaseNodeTarget | null>(null)");
    expect(appPrefix).toContain("function openCaseNode(target: CaseNodeTarget)");
    expect(appPrefix).toContain("setCaseNodeTarget(target)");
    expect(appPrefix).toContain("setCurrentView('cases')");
  });

  it("passes openCaseNode to PreventionView", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("<PreventionView cases={cases} onOpenCaseNode={openCaseNode} />");
  });
});
