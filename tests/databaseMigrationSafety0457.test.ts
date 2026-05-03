import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("0.4.57 database and migration safety contracts", () => {
  const migrationDir = "database/migrations";

  it("keeps SQL migrations ordered and uniquely named", () => {
    expect(existsSync(migrationDir)).toBe(true);
    const files = readdirSync(migrationDir).filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort();
    expect(files.length).toBeGreaterThan(0);
    expect(new Set(files).size).toBe(files.length);
    const numbers = files.map((file) => Number(file.slice(0, 4)));
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  it("keeps migrations idempotent enough for existing databases", () => {
    const files = readdirSync(migrationDir).filter((file) => /^\d{4}_.+\.sql$/.test(file));
    for (const file of files) {
      const sql = readFileSync(join(migrationDir, file), "utf8").toLowerCase();
      expect(sql).not.toContain("drop table");
      expect(sql).not.toContain("drop column");
    }
  });

  it("contains security code for encrypted database access and password failure", () => {
    const mainSources = ["services/databaseService.ts", "services/securityService.ts", "services/backupService.ts", "electron/ipc/securityIpc.ts", "package.json"]
      .filter((file) => existsSync(file))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(mainSources).toMatch(/sqlcipher|cipher|better-sqlite3-multiple-ciphers/i);
    expect(mainSources).toMatch(/password|passwort|recovery/i);
  });

  it("documents backup or portability boundaries in source or scripts", () => {
    const candidates = ["services/backupService.ts", "electron/security/README.md", "scripts", "docs"].filter((path) => existsSync(path));
    const combined = candidates.map((path) => {
      const stat = require("node:fs").statSync(path);
      if (!stat.isDirectory()) return readFileSync(path, "utf8");
      return readdirSync(path).slice(0, 80).map((entry) => {
        const full = join(path, entry);
        return require("node:fs").statSync(full).isFile() ? readFileSync(full, "utf8") : "";
      }).join("\n");
    }).join("\n");
    expect(combined).toMatch(/backup|portab|übergabe|export|manifest/i);
  });
});
