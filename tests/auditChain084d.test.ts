import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.4-d audit hash-chain hardening", () => {
  it("centralizes audit hash-chain hashing and stable metadata serialization", () => {
    const hashChain = readFileSync("services/auditHashChain.ts", "utf8");
    const auditService = readFileSync("services/auditLogService.ts", "utf8");

    expect(hashChain).toContain("PERSONAL_DATA_AUDIT_GENESIS_HASH");
    expect(hashChain).toContain("stableStringify");
    expect(hashChain).toContain("computeAuditEntryHash");
    expect(hashChain).toContain("verifyAuditHashChain");
    expect(hashChain).toContain("previous_hash_mismatch");
    expect(hashChain).toContain("entry_hash_mismatch");
    expect(hashChain).toContain("sequence_gap");
    expect(auditService).toContain("normalizeAuditMetadata");
    expect(auditService).toContain("integritySummary");
  });

  it("surfaces audit-chain manipulation checks in the system integrity report", () => {
    const reportService = readFileSync("services/reportService.ts", "utf8");

    expect(reportService).toContain("new PersonalDataAuditLogService(db).integritySummary()");
    expect(reportService).toContain("Audit-Hash-Chain");
    expect(reportService).toContain("Manipulationsverdacht");
    expect(reportService).toContain("Audit-Chain-Befunde");
    expect(reportService).toContain("PDF-Report als verschlüsselter .gsbvpdf-Container erzeugt");
  });

  it("logs additional personal-data access and change paths", () => {
    const deadlineService = readFileSync("services/deadlineService.ts", "utf8");
    const compliance = readFileSync("services/complianceCenterService.ts", "utf8");

    expect(deadlineService).toContain("Fristenliste anzeigen");
    expect(deadlineService).toContain("Fristendetail anzeigen");
    expect(deadlineService).toContain("Frist personenbezogen angelegt");
    expect(deadlineService).toContain("Frist personenbezogen geändert");
    expect(compliance).toContain("System- und Integritätsbericht prüft die Audit-Hash-Chain");
  });
});
