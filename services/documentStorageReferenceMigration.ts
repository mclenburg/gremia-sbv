import { existsSync } from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { resolveEncryptedDocumentStoragePath } from './documentContainerService.js';

type StoredPathRow = { id: string; storage_path: string };

const DOCUMENT_TABLES = ['case_documents', 'generated_documents'] as const;
const DOCUMENT_DIRECTORIES = new Set(['documents', 'generated', 'generated-documents', 'office']);

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
    for (const table of DOCUMENT_TABLES) {
      const exists = database.prepare<{ value: number }>(
        "SELECT 1 AS value FROM sqlite_master WHERE type = 'table' AND name = ?",
      ).get(table);
      if (!exists) continue;
      const rows = database.prepare<StoredPathRow>(`SELECT id, storage_path FROM ${table}`).all();
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
