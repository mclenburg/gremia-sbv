import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import type { PortableProfile } from '../src/app/core/models/portable-profile.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

export class PortableProfileService {
  constructor(private readonly db: DatabaseAdapter) {}

  ensureDefaultProfile(appRoot: string): PortableProfile {
    const existing = this.get();
    if (existing) return existing;

    const dataRoot = './data';
    const documentRoot = './data/documents';
    const backupRoot = './backups';
    this.db.prepare(`
      INSERT INTO portable_profile (id, is_portable_mode, data_root, document_root, backup_root, last_path_check_at, updated_at)
      VALUES ('default', 1, ?, ?, ?, ?, ?)
    `).run(dataRoot, documentRoot, backupRoot, nowIso(), nowIso());

    // appRoot is intentionally accepted here: future checks can verify that resolved paths stay below it.
    void path.resolve(appRoot, dataRoot);
    return this.get()!;
  }

  get(): PortableProfile | undefined {
    const row = this.db.prepare<any>("SELECT * FROM portable_profile WHERE id = 'default'").get();
    if (!row) return undefined;
    return {
      id: 'default',
      isPortableMode: Boolean(row.is_portable_mode),
      dataRoot: row.data_root,
      documentRoot: row.document_root,
      backupRoot: row.backup_root,
      lastPathCheckAt: row.last_path_check_at ?? undefined,
      notes: row.notes ?? undefined
    };
  }
}
