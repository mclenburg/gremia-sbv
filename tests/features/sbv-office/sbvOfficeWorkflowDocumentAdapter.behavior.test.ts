import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { SbvOfficeWorkflowDocumentAdapter } from '../../../services/sbvOfficeWorkflowDocumentAdapter';

class DocumentDb implements DatabaseAdapter {
  writes = 0;
  prepare<T = unknown>(sql: string) {
    return {
      all: (..._params: unknown[]) => [] as T[],
      get: (..._params: unknown[]) => sql.includes('personal_data_audit_log') ? undefined : undefined,
      run: (..._params: unknown[]) => { this.writes += 1; return {}; },
    };
  }
  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('SbvOfficeWorkflowDocumentAdapter', () => {
  it('uses the existing encrypted document container and links the document to a non-case owner', async () => {
    const db = new DocumentDb();
    const containerCalls: unknown[] = [];
    const containers = {
      writeEncryptedContainer: async (input: unknown) => {
        containerCalls.push(input);
        return { storagePath: '/vault/office/election/doc.gsbvdoc', filename: 'wahlausschreiben.pdf', mimeType: 'application/pdf', sha256: 'a'.repeat(64), documentKey: 'key', iv: 'iv', authTag: 'tag', sizeBytes: 42 };
      },
    };
    const owners = { exists: () => true };
    const adapter = new SbvOfficeWorkflowDocumentAdapter(db, '/vault', containers as never, owners as never);
    const record = await adapter.store({
      owner: { type: 'election', id: 'e-1' }, title: 'Wahlausschreiben', filename: 'wahlausschreiben.pdf', mimeType: 'application/pdf',
      purpose: 'Bekanntmachung', documentClass: 'generated_document', plain: Buffer.from('pdf'),
    });
    expect(record).toMatchObject({ owner: { type: 'election', id: 'e-1' }, documentClass: 'generated_document', sha256: 'a'.repeat(64) });
    expect(containerCalls).toHaveLength(1);
    expect(db.writes).toBe(3);
  });
  it('removes the encrypted file when the database mutation fails', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-office-doc-'));
    const encrypted = path.join(dir, 'failed.gsbvdoc');
    fs.writeFileSync(encrypted, 'encrypted');
    const db = new DocumentDb();
    db.prepare = <T = unknown>(sql: string) => ({
      all: (..._params: unknown[]) => [] as T[],
      get: (..._params: unknown[]) => undefined,
      run: (..._params: unknown[]) => { if (sql.includes('INSERT INTO generated_documents')) throw new Error('injected db failure'); return {}; },
    });
    const containers = { writeEncryptedContainer: async () => ({ storagePath: encrypted, filename: 'failed.pdf', mimeType: 'application/pdf', sha256: 'b'.repeat(64), documentKey: 'key', iv: 'iv', authTag: 'tag', sizeBytes: 9 }) };
    const adapter = new SbvOfficeWorkflowDocumentAdapter(db, dir, containers as never, { exists: () => true } as never);
    await expect(adapter.store({ owner: { type: 'election', id: 'e-1' }, title: 'Fehler', filename: 'failed.pdf', mimeType: 'application/pdf', purpose: 'Test', documentClass: 'generated_document', plain: Buffer.from('pdf') })).rejects.toThrow('injected db failure');
    expect(fs.existsSync(encrypted)).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

});
