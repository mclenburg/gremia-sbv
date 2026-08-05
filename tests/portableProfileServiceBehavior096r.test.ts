import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { PortableProfileService } from '../services/portableProfileService';

type Row = { id: string; is_portable_mode: number; data_root: string; document_root: string; backup_root: string; last_path_check_at: string | null; notes: string | null };
class PortableDb implements DatabaseAdapter {
  row?: Row;
  inserts = 0;
  prepare<T = unknown>(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      get: (): T | undefined => normalized.startsWith('SELECT * FROM portable_profile') ? this.row as T | undefined : undefined,
      all: (): T[] => [],
      run: (...params: unknown[]) => {
        if (normalized.startsWith('INSERT INTO portable_profile')) {
          this.inserts++;
          this.row = { id: 'default', is_portable_mode: 1, data_root: String(params[0]), document_root: String(params[1]), backup_root: String(params[2]), last_path_check_at: String(params[3]), notes: null };
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }
  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}
}

describe('Portable Profile – Initialisierung und Wiederverwendung', () => {
  it('legt genau einmal sichere relative Standardpfade an', () => {
    const db = new PortableDb();
    const service = new PortableProfileService(db);
    const profile = service.ensureDefaultProfile('/opt/gremia');
    expect(profile).toMatchObject({ id: 'default', isPortableMode: true, dataRoot: './data', documentRoot: './data/documents', backupRoot: './backups' });
    expect(profile.lastPathCheckAt).toBeDefined();
    expect(db.inserts).toBe(1);
  });

  it('verwendet ein vorhandenes Profil unverändert und erzeugt kein Duplikat', () => {
    const db = new PortableDb();
    db.row = { id: 'default', is_portable_mode: 0, data_root: '/data', document_root: '/docs', backup_root: '/backup', last_path_check_at: null, notes: 'verwaltet' };
    const profile = new PortableProfileService(db).ensureDefaultProfile('/opt/gremia');
    expect(profile).toEqual({ id: 'default', isPortableMode: false, dataRoot: '/data', documentRoot: '/docs', backupRoot: '/backup', notes: 'verwaltet' });
    expect(db.inserts).toBe(0);
  });
});
