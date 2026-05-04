import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.7.2 Kündigungsvorlagen", () => {
  it("adds a termination deadline and protection-status checklist template", () => {
    const service = readFileSync("services/templateService.ts", "utf8");

    expect(service).toContain("kuendigung-frist-schutzstatus-check");
    expect(service).toContain("Sofortcheck");
    expect(service).toContain("{{kuendigung.schutzstatus}}");
    expect(service).toContain("massnahme:termination_hearing");
  });

  it("keeps statement wording tied to SBV rights and special dismissal protection", () => {
    const service = readFileSync("services/templateService.ts", "utf8");

    expect(service).toContain("§ 178 Abs. 2 Satz 1 SGB IX");
    expect(service).toContain("§§ 168 ff. SGB IX");
  });
});
