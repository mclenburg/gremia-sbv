import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("README and cleanup finalization", () => {
  it("documents the current package version and does not mention not-yet-implemented external product interfaces", () => {
    const readme = readFileSync("README.md", "utf8");
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

    expect(readme).toContain(`Stand: ${packageJson.version}`);
    expect(readme).not.toContain("Gremia.BR");
    expect(readme).not.toContain("GREMIA_BR_INTERFACE");
  });

  it("keeps App.tsx as shell and documents workflowViews as transition file", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("App.tsx               # App-Shell");
    expect(readme).toContain("workflowViews.tsx     # verbleibende Alt-/Übergangsansichten");
    expect(readme).toContain("Neue Fachlogik kommt nicht zurück in `App.tsx`.");
  });

  it("adds cleanup and refactor test scripts", () => {
    const pkg = readFileSync("package.json", "utf8");
    expect(pkg).toContain('"test:readme-final"');
    expect(pkg).toContain('"test:refactor"');
    expect(pkg).toContain('"cleanup:legacy"');
  });

  it("adds a deterministic cleanup script for legacy artifacts", () => {
    const script = readFileSync("scripts/cleanup-legacy-artifacts.cjs", "utf8");
    expect(script).toContain("--dry-run");
    expect(script).toContain("docs/GREMIA_BR_INTERFACE.md");
    expect(script).toContain("services/gremiaBrReadAdapter.ts");
  });
});
