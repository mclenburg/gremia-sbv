export type TableSnapshot = {
  table: string;
  columns: string[];
};

export type IndexSnapshot = {
  name: string;
  table: string;
  columns: string[];
};

export type SqlSchemaSnapshot = {
  tables: Record<string, TableSnapshot>;
  indexes: Record<string, IndexSnapshot>;
};

function splitTopLevelComma(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: 'single' | 'double' | null = null;

  for (const char of input) {
    if (char === "'" && quote !== 'double') quote = quote === 'single' ? null : 'single';
    else if (char === '"' && quote !== 'single') quote = quote === 'double' ? null : 'double';
    else if (quote === null && char === '(') depth += 1;
    else if (quote === null && char === ')') depth -= 1;

    if (quote === null && depth === 0 && char === ',') {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function normalizeIdentifier(value: string): string {
  return value.replace(/["`\[\]]/g, '').trim();
}

function extractTableColumns(body: string): string[] {
  const ignoredPrefixes = ['CONSTRAINT ', 'PRIMARY ', 'FOREIGN ', 'UNIQUE ', 'CHECK '];
  return splitTopLevelComma(body)
    .map((part) => part.trim())
    .filter((part) => !ignoredPrefixes.some((prefix) => part.toUpperCase().startsWith(prefix)))
    .map((part) => normalizeIdentifier(part.split(/\s+/)[0] ?? ''))
    .filter(Boolean);
}

export function createSqlSchemaSnapshot(sql: string): SqlSchemaSnapshot {
  const tables: Record<string, TableSnapshot> = {};
  const indexes: Record<string, IndexSnapshot> = {};
  const tablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w"`\[\]]+)\s*\(([\s\S]*?)\);/gi;
  for (const match of sql.matchAll(tablePattern)) {
    const table = normalizeIdentifier(match[1]);
    tables[table] = { table, columns: extractTableColumns(match[2]) };
  }

  const indexPattern = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w"`\[\]]+)\s+ON\s+([\w"`\[\]]+)\s*\(([\s\S]*?)\);/gi;
  for (const match of sql.matchAll(indexPattern)) {
    const name = normalizeIdentifier(match[1]);
    const table = normalizeIdentifier(match[2]);
    const columns = splitTopLevelComma(match[3])
      .map((part) => normalizeIdentifier(part.trim().split(/\s+/)[0] ?? ''))
      .filter(Boolean);
    indexes[name] = { name, table, columns };
  }

  return { tables, indexes };
}

export function compareTableSnapshot(a: SqlSchemaSnapshot, b: SqlSchemaSnapshot, table: string): string[] {
  const left = a.tables[table]?.columns ?? [];
  const right = b.tables[table]?.columns ?? [];
  const problems: string[] = [];
  for (const column of left) {
    if (!right.includes(column)) problems.push(`Migration fehlt ${table}.${column}`);
  }
  for (const column of right) {
    if (!left.includes(column)) problems.push(`Fresh-Install fehlt ${table}.${column}`);
  }
  return problems;
}

export function compareIndexSnapshot(a: SqlSchemaSnapshot, b: SqlSchemaSnapshot, index: string): string[] {
  const left = a.indexes[index];
  const right = b.indexes[index];
  if (!left || !right) return [`Index ${index} fehlt in ${left ? 'Migration' : 'Fresh-Install'}.`];
  const problems: string[] = [];
  if (left.table !== right.table) problems.push(`Index ${index} zeigt auf unterschiedliche Tabellen.`);
  if (left.columns.join(',') !== right.columns.join(',')) problems.push(`Index ${index} nutzt unterschiedliche Spalten.`);
  return problems;
}
