import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { resolveEncryptedDocumentStoragePath } from './documentContainerService.js';

export type TrackImportedFile = (filePath: string) => void;
export type RetireImportedFile = (storageReference: string) => void;

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

/** Keeps encrypted document files and their database rows within one recoverable import boundary. */
export class CaseHandoverImportUnitOfWork {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly dataDirectoryProvider: () => string,
  ) {}

  run<T>(operation: (trackFile: TrackImportedFile, retireFile: RetireImportedFile) => T): T {
    const storedFiles: string[] = [];
    const retiredFiles: Array<{ reference: string; path: string }> = [];
    const dataRoot = path.resolve(this.dataDirectoryProvider());
    let result: T;
    try {
      result = new DatabaseUnitOfWork(this.database).run(() => operation(
        (filePath) => storedFiles.push(filePath),
        (reference) => retiredFiles.push({ reference,
          path: resolveEncryptedDocumentStoragePath(dataRoot, reference) })));
    } catch (error) {
      for (const filePath of storedFiles.reverse()) {
        const resolved = path.resolve(filePath);
        if (!isInside(dataRoot, resolved)) continue;
        try { fs.rmSync(resolved, { force: true }); } catch { /* orphan scan reports a cleanup failure */ }
      }
      throw error;
    }
    for (const file of retiredFiles) {
      try {
        const stillReferenced = this.database.prepare('SELECT id FROM case_documents WHERE storage_path = ? UNION ALL '
          + 'SELECT id FROM generated_documents WHERE storage_path = ? LIMIT 1').get(file.reference, file.reference);
        if (!stillReferenced) fs.rmSync(file.path, { force: true });
      } catch { /* committed data remains valid; integrity scan reports orphan containers */ }
    }
    return result;
  }
}
