import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.1b robust BEM migration", () => {
  it("does not read unknown legacy columns from early bem_processes tables", () => {
    const sql = readFileSync("database/migrations/0015_bem_process.sql", "utf8");

    expect(sql).toContain("bem_processes_legacy_0500");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS bem_processes");
    expect(sql).toContain("status TEXT NOT NULL DEFAULT 'zu_pruefen'");
    expect(sql).toContain("title TEXT NOT NULL DEFAULT 'BEM-Verfahren'");
    expect(sql).not.toContain("SELECT");
    expect(sql).not.toContain("COALESCE(title");
    expect(sql).not.toContain("current_phase =");
  });

  it("is fresh-install safe by creating a minimal table before rename", () => {
    const sql = readFileSync("database/migrations/0015_bem_process.sql", "utf8");

    const dummyTable = sql.indexOf("CREATE TABLE IF NOT EXISTS bem_processes (\n  id TEXT PRIMARY KEY,\n  case_id TEXT\n);");
    const rename = sql.indexOf("ALTER TABLE bem_processes RENAME TO bem_processes_legacy_0500;");
    const realTable = sql.lastIndexOf("CREATE TABLE IF NOT EXISTS bem_processes (");

    expect(dummyTable).toBeGreaterThan(-1);
    expect(rename).toBeGreaterThan(dummyTable);
    expect(realTable).toBeGreaterThan(rename);
  });
});
