import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("prevention feature imports", () => {
  it("imports HelpCircle where the local StepTooltip uses it", () => {
    const source = readFileSync("src/app/features/prevention/PreventionView.tsx", "utf8");
    expect(source).toContain("import { HelpCircle } from 'lucide-react';");
    expect(source).toContain("<HelpCircle className=\"h-3.5 w-3.5\" />");
  });
});
