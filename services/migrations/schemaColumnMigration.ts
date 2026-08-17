import type { DatabaseAdapter } from "../databaseService.js";

export type SchemaColumnAddition = readonly [
  name: string,
  definition: string,
];

function assertSqlIdentifier(value: string): void {
  if (!/^[a-z][a-z0-9_]*$/i.test(value)) {
    throw new Error(`Ungültiger SQL-Bezeichner in Schema-Migration: ${value}`);
  }
}

export function addColumnsIfMissing(
  db: DatabaseAdapter,
  table: string,
  additions: readonly SchemaColumnAddition[],
): void {
  assertSqlIdentifier(table);
  additions.forEach(([name]) => assertSqlIdentifier(name));

  const existingColumns = new Set(
    db
      .prepare<{ name: string }>(`PRAGMA table_info("${table}")`)
      .all()
      .map((row) => row.name),
  );

  for (const [name, definition] of additions) {
    if (existingColumns.has(name)) continue;
    db.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${definition}`);
    existingColumns.add(name);
  }
}
