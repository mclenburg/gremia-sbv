import { describe, expect, it } from 'vitest';
import { createCipheriv, randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DocumentOcrService, isOcrCandidate, type DocumentOcrRunner } from '../services/documents/documentOcrService';
import type { DatabaseAdapter } from '../services/databaseService';

function encryptedFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'gremia-sbv-ocr-test-'));
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from('fake image bytes')), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const storagePath = path.join(dir, 'scan.gsbvdoc');
  writeFileSync(storagePath, encrypted);
  return { storagePath, key, iv, authTag };
}

class OcrDb implements DatabaseAdapter {
  readonly document: Record<string, unknown>;
  readonly jobs = new Map<string, Record<string, unknown>>();
  readonly auditRows: Record<string, unknown>[] = [];

  constructor() {
    const fixture = encryptedFixture();
    this.document = {
      id: 'doc-1',
      case_id: 'case-1',
      filename: 'scan.png',
      mime_type: 'image/png',
      storage_path: fixture.storagePath,
      document_key: fixture.key.toString('base64'),
      iv: fixture.iv.toString('base64'),
      auth_tag: fixture.authTag.toString('base64'),
      extracted_text: '',
      ocr_status: 'not_required',
    };
  }

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      all(...params: unknown[]): T[] {
        if (sql.includes('FROM case_document_ocr_jobs')) {
          return [...self.jobs.values()].filter((job) => job.status === 'queued').slice(0, Number(params[0] ?? 2)) as T[];
        }
        if (sql.includes('SELECT case_id FROM case_search_index') || sql.includes('SELECT id, case_id FROM case_search_index')) return [] as T[];
        if (sql.includes('sqlite_master')) return [] as T[];
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (sql.includes('FROM case_documents WHERE id = ?')) return self.document.id === params[0] ? self.document as T : undefined;
        if (sql.includes('SELECT COUNT(*) AS count')) return { count: 0 } as T;
        if (sql.includes('SELECT sequence, entry_hash FROM personal_data_audit_log')) return undefined;
        return undefined;
      },
      run(...params: unknown[]) {
        if (sql.includes('INSERT INTO case_document_ocr_jobs')) {
          const [id, document_id, case_id, , ,] = params;
          self.jobs.set(String(id), { id, document_id, case_id, status: 'queued', attempts: 0, created_at: params[3], updated_at: params[4] });
          return { changes: 1 };
        }
        if (sql.includes("UPDATE case_documents SET ocr_status = 'queued'")) {
          self.document.ocr_status = 'queued';
          return { changes: 1 };
        }
        if (sql.includes("UPDATE case_document_ocr_jobs SET status = 'processing'")) {
          const job = self.jobs.get(String(params[2]));
          if (job) Object.assign(job, { status: 'processing', attempts: params[0], updated_at: params[1] });
          return { changes: job ? 1 : 0 };
        }
        if (sql.includes("UPDATE case_documents SET ocr_status = 'processing'")) {
          Object.assign(self.document, { ocr_status: 'processing', ocr_started_at: params[0] });
          return { changes: 1 };
        }
        if (sql.includes('UPDATE case_documents') && sql.includes('ocr_text')) {
          Object.assign(self.document, { ocr_status: params[0], ocr_text: params[1], ocr_engine: params[2], ocr_completed_at: params[3], ocr_error: params[4] });
          return { changes: 1 };
        }
        if (sql.includes('UPDATE case_document_ocr_jobs SET status = ?')) {
          const job = self.jobs.get(String(params[3]));
          if (job) Object.assign(job, { status: params[0], last_error: params[1], updated_at: params[2] });
          return { changes: job ? 1 : 0 };
        }
        if (sql.includes('DELETE FROM case_search_index') || sql.includes('DELETE FROM case_search_index_fts') || sql.includes('DELETE FROM case_search_index_state')) return { changes: 0 };
        if (sql.includes('INSERT INTO personal_data_audit_log')) return { changes: 1 };
        return { changes: 0 };
      },
    };
  }

  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('DocumentOcrService 0.9.1', () => {
  it('erkennt OCR-Kandidaten ohne Plattform- oder Cloud-Annahme', () => {
    expect(isOcrCandidate('scan.png', 'image/png', '')).toBe(true);
    expect(isOcrCandidate('scan.pdf', 'application/pdf', '')).toBe(true);
    expect(isOcrCandidate('protokoll.txt', 'text/plain', '')).toBe(false);
    expect(isOcrCandidate('scan.png', 'image/png', 'bereits extrahierter Text')).toBe(false);
  });

  it('arbeitet OCR-Jobs nachgelagert ab und schreibt OCR-Text in den Vault', async () => {
    const runner: DocumentOcrRunner = {
      id: 'fake-local-ocr',
      canRun: () => true,
      async run() {
        return { status: 'completed', text: 'Gescannter Bescheid mit Arbeitsplatzanpassung', engine: 'fake-local-ocr' };
      },
    };
    const db = new OcrDb();
    const service = new DocumentOcrService(db, runner);

    expect(service.enqueueIfUseful('doc-1')).toBe(true);
    expect(db.document.ocr_status).toBe('queued');

    await service.runPending(1);

    expect(db.document).toMatchObject({
      ocr_status: 'completed',
      ocr_text: 'Gescannter Bescheid mit Arbeitsplatzanpassung',
      ocr_engine: 'fake-local-ocr',
    });
  });
});
