import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.2 BEM overview and case detail alignment", () => {
  it("uses the reusable process overview structure for the BEM dashboard", () => {
    const source = readFileSync("src/app/features/bem/BemView.tsx", "utf8");

    expect(source).toContain("process-overview-panel bem-overview-panel");
    expect(source).toContain("process-overview-stats");
    expect(source).toContain("process-overview-group-header");
    expect(source).toContain("collapsedByDefault: isDoneBemStatus(status) || records.length === 0");
    expect(source).toContain("return [...activeGroups, ...(nextEmptyGroup ? [nextEmptyGroup] : []), ...doneGroups]");
    expect(source).toContain("onOpenCaseNode({ caseId: selected.caseId, nodeType: 'bem', nodeId: selected.id })");
  });

  it("aligns the BEM case detail header with the prevention process detail", () => {
    const source = readFileSync("src/app/features/bem/BemProcessDetail.tsx", "utf8");

    expect(source).toContain("case-detail-inline-form");
    expect(source).toContain("case-process-header");
    expect(source).toContain("case-process-title-row");
    expect(source).toContain("case-process-document-link");
    expect(source).toContain("case-process-badges");
    expect(source).toContain('<span className="case-process-badge"><strong>Status</strong>{bemStatusLabel(process.status)}</span>');
    expect(source).toContain("<strong>Reaktion</strong>{process.employeeResponse.replaceAll('_', ' ')}");
  });

  it("keeps dedicated CSS refinements for the compact BEM overview", () => {
    const css = readFileSync("src/app/processOverview.css", "utf8");

    expect(css).toContain("process-overview-topline");
    expect(css).toContain("bem-overview-panel");
    expect(css).toContain("process-overview-card.is-critical");
  });
});
