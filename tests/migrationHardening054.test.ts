import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.4 migration hardening", () => {
  it("bumps the app schema version to the BEM migration", () => {
    const source = readFileSync("services/migrationService.ts", "utf8");

    expect(source).toContain("import { APP_SCHEMA_VERSION");
    expect(source).toContain("APP_VERSION");
    expect(source).toContain("diagnostics: string[]");
  });

  it("recognizes an already applied BEM schema instead of re-running migration 0015", () => {
    const source = readFileSync("services/migrationService.ts", "utf8");

    expect(source).toContain("case '0015'");
    expect(source).toContain("this.columnExists('bem_processes', 'status')");
    expect(source).toContain("this.columnExists('bem_processes', 'employee_response')");
    expect(source).toContain("this.tableExists('bem_process_contacts')");
    expect(source).toContain("this.tableExists('bem_process_events')");
  });

  it("validates required schema after migration", () => {
    const source = readFileSync("services/migrationService.ts", "utf8");

    expect(source).toContain("private validateRequiredSchema");
    expect(source).toContain("Datenbankschema unvollständig: Tabelle");
    expect(source).toContain("Datenbankschema unvollständig: Spalte");
    expect(source).toContain("bem_processes_legacy_0500");
  });

  it("keeps the fresh database schema on the current BEM structure", () => {
    const sql = readFileSync("database/schema.sql", "utf8");

    expect(sql).toContain("status TEXT NOT NULL DEFAULT 'zu_pruefen'");
    expect(sql).toContain("employee_response TEXT NOT NULL DEFAULT 'offen'");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS bem_process_contacts");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS bem_process_events");
    expect(sql).not.toContain("current_phase TEXT NOT NULL CHECK");
    expect(sql).not.toContain("consent_status TEXT NOT NULL CHECK");
  });

  it("keeps migration 0015 conservative and does not select from unknown legacy columns", () => {
    const sql = readFileSync("database/migrations/0015_bem_process.sql", "utf8");

    expect(sql).toContain("ALTER TABLE bem_processes RENAME TO bem_processes_legacy_0500");
    expect(sql).toContain("status TEXT NOT NULL DEFAULT 'zu_pruefen'");
    expect(sql).not.toContain("SELECT");
    expect(sql).not.toContain("current_phase =");
    expect(sql).not.toContain("COALESCE(title");
    expect(sql).toContain("DROP TABLE IF EXISTS bem_process_contacts");
    expect(sql).toContain("DROP TABLE IF EXISTS bem_process_events");
  });
});
