import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.12-d BEM migration fresh-install guard", () => {
  it("keeps the minimal bem_processes table immediately before the legacy rename", () => {
    const sql = readFileSync("database/migrations/0015_bem_process.sql", "utf8");

    const dummyTable = sql.indexOf("CREATE TABLE IF NOT EXISTS bem_processes (\n  id TEXT PRIMARY KEY,\n  case_id TEXT\n);");
    const rename = sql.indexOf("ALTER TABLE bem_processes RENAME TO bem_processes_legacy_0500;");
    const realTable = sql.lastIndexOf("CREATE TABLE IF NOT EXISTS bem_processes (");

    expect(dummyTable).toBeGreaterThan(-1);
    expect(rename).toBeGreaterThan(dummyTable);
    expect(realTable).toBeGreaterThan(rename);
  });

  it("does not relax the native dependency postinstall contract", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));

    expect(pkg.version).toMatch(/^0\.8\.12(?:-[a-z])?$/);
    expect(pkg.scripts.postinstall).toBe("electron-builder install-app-deps");
  });
});
