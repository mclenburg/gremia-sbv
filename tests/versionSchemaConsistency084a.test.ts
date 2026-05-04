import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import packageJson from "../package.json";
import { APP_VERSION as RENDERER_APP_VERSION } from "../src/app/generated/appVersion";
import { APP_VERSION as SERVICE_APP_VERSION } from "../services/generated/appMetadata";
import { APP_SCHEMA_VERSION } from "../services/appSchema";

describe("0.8.4a version and schema consistency", () => {
  it("uses one generated app version for renderer and services", () => {
    expect(RENDERER_APP_VERSION).toBe(packageJson.version);
    expect(SERVICE_APP_VERSION).toBe(packageJson.version);
  });

  it("uses schema version 0018 consistently for migrations and backup warnings", () => {
    const migrationService = readFileSync("services/migrationService.ts", "utf8");
    const backupService = readFileSync("services/backupService.ts", "utf8");

    expect(APP_SCHEMA_VERSION).toBe("0018");
    expect(migrationService).toContain("APP_SCHEMA_VERSION");
    expect(migrationService).toContain("repairKnownSchemaDrift");
    expect(migrationService).toContain("rebuildTerminationHearingsTable");
    expect(backupService).toContain("APP_SCHEMA_VERSION");
    expect(backupService).not.toContain("Schema-Version 0016");
  });

  it("fresh schema contains the repaired termination hearing table", () => {
    const schema = readFileSync("database/schema.sql", "utf8");

    expect(schema).toContain("status TEXT NOT NULL DEFAULT 'eingang'");
    expect(schema).toContain("received_at TEXT");
    expect(schema).toContain("protection_status TEXT NOT NULL DEFAULT 'unklar'");
    expect(schema).toContain("idx_termination_hearings_status ON termination_hearings(status)");
    expect(schema).not.toContain("hearing_received_at TEXT NOT NULL");
    expect(schema).not.toContain("statement_status TEXT NOT NULL");
  });

  it("marks termination hearing as an implemented view", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const implementedSet = app.slice(app.indexOf("const IMPLEMENTED_VIEW_IDS"), app.indexOf("function isImplementedView"));

    expect(implementedSet).toContain("'termination_hearing'");
  });
});
