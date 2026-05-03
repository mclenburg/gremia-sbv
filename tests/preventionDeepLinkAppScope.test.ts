import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("prevention deep link App scope", () => {
  it("declares openCaseNode outside the security useEffect and before hooks continue", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const appStart = app.indexOf("export function App()");
    const currentModule = app.indexOf("const currentModule = useMemo", appStart);
    const shortcutsHook = app.indexOf("useModalKeyboardShortcuts", appStart);
    const openCaseNode = app.indexOf("function openCaseNode(target: CaseNodeTarget)", appStart);

    expect(openCaseNode).toBeGreaterThan(currentModule);
    expect(openCaseNode).toBeLessThan(shortcutsHook);
  });

  it("does not declare openCaseNode inside the first useEffect cleanup block", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const appStart = app.indexOf("export function App()");
    const effectStart = app.indexOf("useEffect(() => {", appStart);
    const effectEnd = app.indexOf("  }, []);", effectStart);
    const effectBody = app.slice(effectStart, effectEnd);

    expect(effectBody).not.toContain("function openCaseNode(target: CaseNodeTarget)");
  });

  it("passes openCaseNode to PreventionView", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("<PreventionView cases={cases} onOpenCaseNode={openCaseNode} />");
  });
});
