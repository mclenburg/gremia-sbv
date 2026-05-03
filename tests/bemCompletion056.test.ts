import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.6 BEM completion", () => {
  it("extends the BEM model with Datenschutz, consent, measures and completion fields", () => {
    const model = readFileSync("src/app/core/models/bem.model.ts", "utf8");

    for (const field of ["privacyNoticeAt", "consentScope", "consentWithdrawnAt", "dataRetentionNote", "measureOwners", "completionReason"]) {
      expect(model).toContain(field);
    }
  });

  it("persists the BEM completion fields in service and schema", () => {
    const service = readFileSync("services/bemService.ts", "utf8");
    const schema = readFileSync("database/schema.sql", "utf8");
    const migration = readFileSync("database/migrations/0016_bem_completion.sql", "utf8");

    for (const column of ["privacy_notice_at", "consent_scope", "consent_withdrawn_at", "data_retention_note", "measure_owners", "completion_reason"]) {
      expect(service).toContain(column);
      expect(schema).toContain(column);
      expect(migration).toContain(column);
    }
  });

  it("adds BEM sections for Datenschutz, measures ownership and completion", () => {
    const detail = readFileSync("src/app/features/bem/BemProcessDetail.tsx", "utf8");

    expect(detail).toContain("Datenschutz und Einwilligung");
    expect(detail).toContain("Einwilligungsumfang / Beteiligte");
    expect(detail).toContain("Aufbewahrung / Löschhinweis");
    expect(detail).toContain("Verantwortliche / Umsetzung");
    expect(detail).toContain("Abschlussgrund");
  });

  it("updates schema migration version and BEM workflow warnings", () => {
    const migrationService = readFileSync("services/migrationService.ts", "utf8");
    const policy = readFileSync("services/bemWorkflowPolicy.ts", "utf8");

    expect(migrationService).toContain("const APP_SCHEMA_VERSION = '0016'");
    expect(migrationService).toContain("case '0016'");
    expect(policy).toContain("Datenschutzhinweis");
    expect(policy).toContain("Einwilligungsumfang");
    expect(policy).toContain("Abschlussgrund");
  });
});
