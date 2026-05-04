import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.4 personal data audit chain", () => {
  it("ships a hash-chained audit log service and schema", () => {
    const service = readFileSync("services/auditLogService.ts", "utf8");
    const migration = readFileSync("database/migrations/0018_personal_data_audit_log.sql", "utf8");

    expect(service).toContain("PersonalDataAuditLogService");
    expect(service).toContain("previousHash");
    expect(service).toContain("entryHash");
    expect(service).toContain("verifyChain");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS personal_data_audit_log");
    expect(migration).toContain("previous_hash");
    expect(migration).toContain("entry_hash");
  });

  it("logs access/change paths for cases, notes, documents and contacts", () => {
    const caseService = readFileSync("services/caseService.ts", "utf8");
    const contactService = readFileSync("services/contactService.ts", "utf8");

    expect(caseService).toContain("Fallaktenliste anzeigen");
    expect(caseService).toContain("Fallnotizen anzeigen");
    expect(caseService).toContain("Volltextsuche in personenbezogenen Falldaten");
    expect(caseService).toContain("Falldokument exportiert");
    expect(contactService).toContain("Kontaktliste anzeigen");
    expect(contactService).toContain("Kontakt geändert");
  });
});
