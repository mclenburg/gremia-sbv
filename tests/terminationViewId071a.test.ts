import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.7.1a termination ViewId fix", () => {
  it("uses termination_hearing as the navigation ViewId", () => {
    const modules = readFileSync("src/app/core/navigation/modules.ts", "utf8");

    expect(modules).toContain("| 'termination_hearing'");
    expect(modules).toContain("id: 'termination_hearing'");
    expect(modules).not.toContain("| 'termination'\n");
    expect(modules).not.toContain("id: 'termination',");
  });

  it("matches the App view guard and render condition", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(app).toContain("'termination_hearing'");
    expect(app).toContain("currentView === 'termination_hearing'");
  });
});
