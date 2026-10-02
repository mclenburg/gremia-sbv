
export interface MigrationRow {
  version: string;
  filename: string;
  checksum: string;
  applied_at: string;
  app_version?: string | null;
  mode?: string | null;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
  inferred: string[];
  currentSchemaVersion: string;
  diagnostics: string[];
}

export interface MigrationDefinition {
  version: string;
  filename: string;
  path: string;
  checksum: string;
}

export const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  app_version TEXT,
  mode TEXT NOT NULL DEFAULT 'sql',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS schema_migration_log (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);
`;

export function nowIso(): string {
  return new Date().toISOString();
}

export function checksum(content: string): string {
  let hash = 5381;
  for (let index = 0; index < content.length; index += 1) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normalizeSql(sql: string): string {
  return sql
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const previous = index > 0 ? sql[index - 1] : '';

    if (char === "'" && quote !== 'double' && previous !== '\\') {
      quote = quote === 'single' ? null : 'single';
    } else if (char === '"' && quote !== 'single' && previous !== '\\') {
      quote = quote === 'double' ? null : 'double';
    }

    if (char === ';' && quote === null) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
    } else {
      current += char;
    }
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

export function getVersionFromFilename(filename: string): string | null {
  const match = filename.match(/^(\d{4})[_-].+\.sql$/i);
  return match?.[1] ?? null;
}

export function isAlterAddColumnStatement(statement: string): boolean {
  return /^ALTER\s+TABLE\s+\w+\s+ADD\s+COLUMN\s+/i.test(statement.trim());
}

export function parseAddColumnStatement(statement: string): { table: string; column: string } | null {
  const match = statement.trim().match(/^ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\b/i);
  if (!match) return null;
  return { table: match[1], column: match[2] };
}

export function isCreateIndexStatement(statement: string): boolean {
  return /^CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+/i.test(statement.trim());
}

export function rowToBoolean(row: unknown): boolean {
  return Boolean((row as { found?: number } | undefined)?.found);
}
