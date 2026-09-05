import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';

export type TrackImportedFile = (filePath: string) => void;

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

  run<T>(operation: (trackFile: TrackImportedFile) => T): T {
    const storedFiles: string[] = [];
    try {
      return new DatabaseUnitOfWork(this.database).run(() => operation((filePath) => storedFiles.push(filePath)));
    } catch (error) {
      const dataRoot = path.resolve(this.dataDirectoryProvider());
      for (const filePath of storedFiles.reverse()) {
        const resolved = path.resolve(filePath);
        if (!isInside(dataRoot, resolved)) continue;
        try { fs.rmSync(resolved, { force: true }); } catch { /* orphan scan reports a cleanup failure */ }
      }
      throw error;
    }
  }
}
