import type { DatabaseAdapter } from './databaseService.js';

export function uniqueImportedCaseNumber(database: DatabaseAdapter, base: string, preserveWhenAvailable = false): string {
  const sanitized = base.replace(/\s+/g, '-').slice(0, 80) || 'UEBERGABE';
  const exists = (value: string) => Boolean(database.prepare<{ id: string }>('SELECT id FROM cases WHERE case_number = ?').get(value));
  if (preserveWhenAvailable && !exists(sanitized)) return sanitized;
  let candidate = `${sanitized}-IMPORT`;
  let index = 2;
  while (exists(candidate)) candidate = `${sanitized}-IMPORT-${index++}`;
  return candidate;
}
