import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.10a deadlines import fix", () => {
  it("imports extracted deadline components in App", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(app).toContain("import { DeadlinesView, DeadlineEditor } from './features/deadlines/DeadlinesView';");
    expect(app).toContain("<DeadlinesView");
    expect(app).toContain("<DeadlineEditor");
  });

  it("keeps deadline components exported from the deadline feature", () => {
    const deadlines = readFileSync("src/app/features/deadlines/DeadlinesView.tsx", "utf8");

    expect(deadlines).toContain("export function DeadlinesView");
    expect(deadlines).toContain("export function DeadlineEditor");
  });
});
