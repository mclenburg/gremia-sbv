import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CASE_MEASURES_REQUIRED_COLUMNS } from "../services/appSchema";
import { createSqlSchemaSnapshot } from "../services/schemaSnapshotPolicy";

const handoverColumns = [
  "handover_import_id",
  "handover_package_id",
  "handover_valid_until",
  "handover_status",
  "handover_continue_confirmed_at",
  "handover_continue_reason",
] as const;

function schemaColumns(sql: string, table: string): string[] {
  return createSqlSchemaSnapshot(sql).tables[table]?.columns ?? [];
}

describe("Demo-Modus Schema-Vollständigkeit", () => {
  it("legt frische Demo-Tresore mit dem vollständigen case_measures-App-Schema an", () => {
    const freshColumns = schemaColumns(readFileSync("database/schema.sql", "utf8"), "case_measures");

    expect(freshColumns).toEqual(expect.arrayContaining([...CASE_MEASURES_REQUIRED_COLUMNS]));
    expect(freshColumns).toEqual(expect.arrayContaining([...handoverColumns]));
  });

  it("hält Migration 0036 und Basisschema für Fallübergaben strukturell zusammen", () => {
    const freshColumns = schemaColumns(readFileSync("database/schema.sql", "utf8"), "case_measures");
    const migratedColumns = schemaColumns(readFileSync("database/migrations/0036_case_handover_transfer.sql", "utf8"), "case_measures");

    expect(migratedColumns).toEqual(expect.arrayContaining([...handoverColumns]));
    expect(handoverColumns.every((column) => freshColumns.includes(column) && migratedColumns.includes(column))).toBe(true);
  });

  it("repariert ältere case_measures-Tabellen defensiv über ADD COLUMN statt nur über CREATE TABLE IF NOT EXISTS", () => {
    const migrationService = readFileSync("services/migrationService.ts", "utf8");

    expect(migrationService.includes("ensureCaseMeasureHandoverColumns()")).toBe(true);
    expect(handoverColumns.every((column) => migrationService.includes(`this.addColumnIfMissing('case_measures', '${column}'`))).toBe(true);
  });
});
