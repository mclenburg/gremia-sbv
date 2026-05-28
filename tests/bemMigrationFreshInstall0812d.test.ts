import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { indexOfPattern, readNormalizedSourceText } from "./helpers/sourceText";

const minimalBemProcessTablePattern = /CREATE TABLE IF NOT EXISTS bem_processes\s*\(\s*id TEXT PRIMARY KEY,\s*case_id TEXT\s*\);/m;

describe("BEM migration fresh-install guard", () => {
  it("keeps the minimal bem_processes table immediately before the legacy rename", () => {
    const sql = readNormalizedSourceText("database/migrations/0015_bem_process.sql");

    const dummyTable = indexOfPattern(sql, minimalBemProcessTablePattern);
    const rename = sql.indexOf("ALTER TABLE bem_processes RENAME TO bem_processes_legacy_0500;");
    const realTable = sql.lastIndexOf("CREATE TABLE IF NOT EXISTS bem_processes (");

    expect(dummyTable).toBeGreaterThan(-1);
    expect(rename).toBeGreaterThan(dummyTable);
    expect(realTable).toBeGreaterThan(rename);
  });

  it("keeps native dependency rebuild explicit and outside npm install", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts.postinstall).toBeUndefined();
    expect(pkg.scripts["native:install-app-deps"]).toBe("node scripts/install-electron-app-deps.cjs");
    expect(pkg.scripts["native:rebuild:electron"]).toBe("node scripts/install-electron-app-deps.cjs");
  });
});
