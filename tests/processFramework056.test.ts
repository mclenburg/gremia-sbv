import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.6 generic process framework", () => {
  it("extracts shared process overview components", () => {
    const source = readFileSync("src/app/shared/process/ProcessOverview.tsx", "utf8");

    expect(source).toContain("export type ProcessOverviewStatusGroup");
    expect(source).toContain("export type ProcessOverviewCardModel");
    expect(source).toContain("export function groupProcessOverviewRecords");
    expect(source).toContain("export function ProcessOverviewPage");
    expect(source).toContain("export function ProcessOverviewCard");
  });

  it("uses the shared process overview from BEM and prevention", () => {
    const bem = readFileSync("src/app/features/bem/BemView.tsx", "utf8");
    const prevention = readFileSync("src/app/features/prevention/PreventionView.tsx", "utf8");

    expect(bem).toContain("../../shared/process/ProcessOverview");
    expect(prevention).toContain("../../shared/process/ProcessOverview");
    expect(bem).toContain("ProcessOverviewPage");
    expect(prevention).toContain("ProcessOverviewPage");
  });

  it("extracts the shared process detail header", () => {
    const header = readFileSync("src/app/shared/process/ProcessDetailHeader.tsx", "utf8");
    const bem = readFileSync("src/app/features/bem/BemProcessDetail.tsx", "utf8");

    expect(header).toContain("export function ProcessDetailHeader");
    expect(header).toContain("export function ProcessSection");
    expect(bem).toContain("ProcessDetailHeader");
    expect(bem).toContain("ProcessSection");
  });
});
