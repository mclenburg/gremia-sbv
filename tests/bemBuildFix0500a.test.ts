import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.0a BEM build fixes", () => {
  it("uses a real BEM type guard before accessing BEM-only template placeholders", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("function isBemProcessRecord");
    expect(workflow).toContain("process is BemProcessRecord");
    expect(workflow).toContain("if (isBemProcessRecord(process))");
    expect(workflow).toContain("'bem.titel': process.title");
  });

  it("keeps prevention placeholders in the non-BEM branch", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("'praevention.status': statusLabel(process.status)");
    expect(workflow).toContain("'praevention.gefaehrdung': process.hazardDescription");
  });

  it("keeps the BemService compatibility API expected by service tests", () => {
    const service = readFileSync("services/bemService.ts", "utf8");

    expect(service).toContain("createForCase(caseId: string, triggerDate?: string)");
    expect(service).toContain("return this.create({");
  });
});
