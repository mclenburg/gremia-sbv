import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("workflowViews missing helper regression 0.4.42a", () => {
  it("keeps bridge and text replacement helpers local to workflowViews", () => {
    const source = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(source).toContain("function getBridge(): Window['gremiaSbv'] | null");
    expect(source).toContain("export async function waitForBridge");
    expect(source).toContain("function replaceRange(value: string, start: number, length: number, replacement: string): string");
    expect(source).toContain("return `${value.slice(0, start)}${replacement}${value.slice(start + length)}`;");
  });
});
