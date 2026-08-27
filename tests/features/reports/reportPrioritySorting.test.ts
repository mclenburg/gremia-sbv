import { describe, expect, it } from "vitest";
import type { ReportDescriptor } from "../../../src/domain/models/report.model";
import { sortReportDescriptorsByPriority } from "../../../src/app/features/reports/reportService";

function descriptor(type: ReportDescriptor["type"], group: ReportDescriptor["group"]): ReportDescriptor {
  return {
    type,
    group,
    title: type,
    shortTitle: type,
    description: type,
    confidentiality: "internal",
  };
}

describe("Berichtskatalog-Priorisierung", () => {
  it("sortiert notwendige SBV- und Datenschutzberichte vor Spezial- und Technikberichten", () => {
    const sorted = sortReportDescriptorsByPriority([
      descriptor("system_integrity", "system"),
      descriptor("equalization_gdb", "sbv"),
      descriptor("activity", "sbv"),
      descriptor("retention_cleanup", "datenschutz"),
      descriptor("case_deadline_controlling", "sbv"),
      descriptor("privacy_audit", "datenschutz"),
    ]);

    expect(sorted.map((item) => item.type)).toEqual([
      "activity",
      "privacy_audit",
      "retention_cleanup",
      "case_deadline_controlling",
      "equalization_gdb",
      "system_integrity",
    ]);
  });
});
