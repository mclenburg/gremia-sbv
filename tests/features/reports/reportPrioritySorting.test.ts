import { describe, expect, it } from "vitest";
import type { ReportDescriptor } from "../../../src/domain/models/report.model";
import {
  isReportGenerationActionDisabled,
  isReportOpenActionDisabled,
  sortReportDescriptorsByPriority,
} from "../../../src/app/features/reports/reportService";

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

describe("Berichte-Buttonzustände", () => {
  it("blockiert neue Berichtserzeugung nicht durch einen laufenden Vorschauauftrag", () => {
    expect(isReportGenerationActionDisabled({
      isGenerating: false,
      hasSelectedDescriptor: true,
    })).toBe(false);
    expect(isReportOpenActionDisabled({
      openingFileName: "taetigkeitsbericht.pdf",
      fileName: "taetigkeitsbericht.pdf",
    })).toBe(true);
    expect(isReportOpenActionDisabled({
      openingFileName: "taetigkeitsbericht.pdf",
      fileName: "datenschutz-audit.pdf",
    })).toBe(false);
  });
});
