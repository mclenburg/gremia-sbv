import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.0b migration 0017 repair", () => {
  it("rebuilds a partial termination_hearings table before creating indexes", () => {
    const migration = readFileSync("database/migrations/0017_termination_hearings.sql", "utf8");

    expect(migration).toContain("DROP TABLE IF EXISTS termination_hearings");
    expect(migration).toContain("CREATE TABLE termination_hearings");
    expect(migration).toContain("status TEXT NOT NULL DEFAULT 'eingang'");
    expect(migration).toContain("termination_type TEXT NOT NULL DEFAULT 'sonstiges'");
    expect(migration).toContain("protection_status TEXT NOT NULL DEFAULT 'unklar'");
    expect(migration).toContain("idx_termination_hearings_status ON termination_hearings(status)");
  });

  it("documents the previous partial-migration failure mode", () => {
    const migration = readFileSync("database/migrations/0017_termination_hearings.sql", "utf8");

    expect(migration).toContain("partial termination_hearings table");
    expect(migration).toContain("no such column: status");
  });
});
