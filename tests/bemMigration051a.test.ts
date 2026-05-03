import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.1a BEM migration repair", () => {
  it("repairs early incomplete bem_processes tables before creating status indexes", () => {
    const sql = readFileSync("database/migrations/0015_bem_process.sql", "utf8");

    expect(sql).toContain("bem_processes_legacy_0500");
    expect(sql).toContain("current_phase");
    expect(sql).toContain("status TEXT NOT NULL DEFAULT 'zu_pruefen'");
    expect(sql.indexOf("CREATE INDEX IF NOT EXISTS idx_bem_processes_status")).toBeGreaterThan(sql.indexOf("CREATE TABLE IF NOT EXISTS bem_processes ("));
  });
});
