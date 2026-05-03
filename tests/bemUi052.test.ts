import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.2 BEM overview and case detail alignment", () => {
  it("uses the reusable process overview structure for the BEM dashboard", () => {
    const source = readFileSync("src/app/features/bem/BemView.tsx", "utf8");

    expect(source).toContain("ProcessOverviewPage");
    expect(source).toContain("stats={[");
    expect(source).toContain("groupProcessOverviewRecords");
    expect(source).toContain("keepNextEmptyActiveGroup: true");
    expect(readFileSync("src/app/shared/process/ProcessOverview.tsx", "utf8")).toContain("return [...activeGroups, ...(nextEmptyGroup ? [nextEmptyGroup] : []), ...doneGroups]");
    expect(source).toContain("onOpenCaseNode({ caseId: selected.caseId, nodeType: 'bem', nodeId: selected.id })");
  });

  it("aligns the BEM case detail header with the prevention process detail", () => {
    const source = readFileSync("src/app/features/bem/BemProcessDetail.tsx", "utf8");

    expect(source).toContain("case-detail-inline-form");
    expect(source).toContain("ProcessDetailHeader");
    expect(readFileSync("src/app/shared/process/ProcessDetailHeader.tsx", "utf8")).toContain("case-process-title-row");
    expect(readFileSync("src/app/shared/process/ProcessDetailHeader.tsx", "utf8")).toContain("case-process-document-link");
    expect(readFileSync("src/app/shared/process/ProcessDetailHeader.tsx", "utf8")).toContain("case-process-badges");
    expect(source).toContain("{ label: 'Status', value: bemStatusLabel(process.status) }");
    expect(source).toContain("{ label: 'Reaktion', value: process.employeeResponse.replaceAll('_', ' ') }");
  });

  it("keeps dedicated CSS refinements for the compact BEM overview", () => {
    const css = readFileSync("src/app/processOverview.css", "utf8");

    expect(css).toContain("process-overview-topline");
    expect(css).toContain("bem-overview-panel");
    expect(css).toContain("process-overview-card.is-critical");
  });
});
