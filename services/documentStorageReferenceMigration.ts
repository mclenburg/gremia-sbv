import { existsSync } from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { APP_SCHEMA_VERSION } from './appSchema.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { resolveEncryptedDocumentStoragePath } from './documentContainerService.js';

type StoredPathRow = { id: string; storage_path: string };

const DOCUMENT_TABLES = ['case_documents', 'generated_documents'] as const;
const DOCUMENT_DIRECTORIES = new Set(['documents', 'generated', 'generated-documents', 'office']);
const DOCUMENT_PATH_NORMALIZATION_KEY = 'database.runtime.documentPathNormalizationVersion';
const ABSOLUTE_PATH_FILTER = `
  storage_path GLOB '/*'
  OR storage_path GLOB '\\*'
  OR storage_path GLOB '[A-Za-z]:/*'
  OR storage_path GLOB '[A-Za-z]:\\*'
`;

function existingDocumentTables(database: DatabaseAdapter): string[] {
  return DOCUMENT_TABLES.filter((table) => Boolean(database.prepare<{ value: number }>(
    "SELECT 1 AS value FROM sqlite_master WHERE type = 'table' AND name = ?",
  ).get(table)));
}

function isAbsoluteOnSupportedPlatform(value: string): boolean {
  return path.isAbsolute(value) || path.win32.isAbsolute(value);
}

function restoredReference(dataDir: string, row: StoredPathRow): string | undefined {
  if (!isAbsoluteOnSupportedPlatform(row.storage_path)) return undefined;
  const segments = row.storage_path.replace(/\\/g, '/').split('/');
  if (segments.at(-1) !== `${row.id}.gsbvdoc`) return undefined;
  for (let index = 0; index < segments.length - 1; index += 1) {
    if (!DOCUMENT_DIRECTORIES.has(segments[index])) continue;
    const reference = segments.slice(index).join('/');
    try {
      const resolved = resolveEncryptedDocumentStoragePath(dataDir, reference);
      if (existsSync(resolved)) return reference;
    } catch {
      // Ein fehlender oder symbolischer Zielpfad wird nicht automatisch übernommen.
    }
  }
  return undefined;
}

export function normalizeStoredDocumentPaths(database: DatabaseAdapter, dataDir: string): number {
  let changed = 0;
  new DatabaseUnitOfWork(database).run(() => {
    for (const table of existingDocumentTables(database)) {
      const rows = database.prepare<StoredPathRow>(`
        SELECT id, storage_path FROM ${table}
        WHERE ${ABSOLUTE_PATH_FILTER}
      `).all();
      for (const row of rows) {
        const reference = restoredReference(dataDir, row);
        if (!reference) continue;
        database.prepare(`UPDATE ${table} SET storage_path = ? WHERE id = ?`).run(reference, row.id);
        changed += 1;
      }
    }
  });
  return changed;
}

export function normalizeStoredDocumentPathsOnce(database: DatabaseAdapter, dataDir: string): number {
  const recorded = database.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?')
    .get(DOCUMENT_PATH_NORMALIZATION_KEY)?.value;
  if (recorded === APP_SCHEMA_VERSION) return 0;
  const changed = normalizeStoredDocumentPaths(database, dataDir);
  const hasUnresolvedPaths = existingDocumentTables(database).some((table) => Boolean(
    database.prepare(`SELECT 1 FROM ${table} WHERE ${ABSOLUTE_PATH_FILTER} LIMIT 1`).get(),
  ));
  if (hasUnresolvedPaths) return changed;
  database.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(DOCUMENT_PATH_NORMALIZATION_KEY, APP_SCHEMA_VERSION, new Date().toISOString());
  return changed;
}
