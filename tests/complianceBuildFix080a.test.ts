import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.0a ComplianceView build fix", () => {
  it("does not pass unsupported icon prop to ModuleFrame", () => {
    const source = readFileSync("src/app/features/compliance/ComplianceView.tsx", "utf8");

    expect(source).toContain("<ModuleFrame");
    expect(source).not.toContain("icon={ShieldCheck}");
    expect(source).not.toContain("ShieldCheck");
  });
});
