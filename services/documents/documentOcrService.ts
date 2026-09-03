import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from '../databaseService.js';
import { SearchIndexService } from '../search/searchIndexService.js';
import { inferMimeType } from './documentTextExtractionService.js';
import { DocumentContainerService } from '../documentContainerService.js';
import { ensureDocumentOcrRuntimeSchema } from '../runtimeSchemaCompatibility.js';

const OCR_ERROR_LIMIT = 1_000;
const OCR_TEXT_LIMIT = 300_000;

export type DocumentOcrStatus = 'not_required' | 'queued' | 'processing' | 'completed' | 'unsupported' | 'failed';
export type DocumentOcrJobStatus = Exclude<DocumentOcrStatus, 'not_required'>;

export interface DocumentOcrResult {
  status: Extract<DocumentOcrStatus, 'completed' | 'unsupported' | 'failed'>;
  text: string;
  engine: string;
  error?: string;
}

export interface DocumentOcrRunner {
  readonly id: string;
  canRun(row: DocumentOcrRow): boolean;
  run(row: DocumentOcrRow, buffer: Buffer): Promise<DocumentOcrResult>;
}

interface DocumentOcrRow {
  id: string;
  case_id: string;
  filename: string;
  mime_type?: string | null;
  storage_path: string;
  document_key: string;
  iv: string;
  auth_tag: string;
  ocr_status?: string | null;
  extracted_text?: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, OCR_ERROR_LIMIT);
  return String(error ?? 'Unbekannter OCR-Fehler').slice(0, OCR_ERROR_LIMIT);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, OCR_TEXT_LIMIT);
}

export function isOcrCandidate(filename: string, mimeType: string | undefined, extractedText: string | undefined): boolean {
  if (extractedText?.trim()) return false;
  const normalizedMime = (mimeType || inferMimeType(filename)).toLowerCase();
  return normalizedMime.startsWith('image/') || normalizedMime === 'application/pdf';
}

class LocalTesseractOcrRunner implements DocumentOcrRunner {
  readonly id = 'local-tesseract';

  canRun(row: DocumentOcrRow): boolean {
    const mimeType = (row.mime_type || inferMimeType(row.filename)).toLowerCase();
    return mimeType.startsWith('image/');
  }

  async run(row: DocumentOcrRow, buffer: Buffer): Promise<DocumentOcrResult> {
    if (!this.canRun(row)) {
      return { status: 'unsupported', text: '', engine: this.id, error: 'OCR wird aktuell nur für lokal lesbare Bilddateien ausgeführt.' };
    }
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gremia-sbv-ocr-'));
    const extension = path.extname(row.filename) || '.img';
    const inputPath = path.join(dir, `source${extension}`);
    await fs.promises.writeFile(inputPath, buffer);
    try {
      const executable = process.env.GREMIA_SBV_TESSERACT_PATH || 'tesseract';
      const languages = process.env.GREMIA_SBV_TESSERACT_LANG || 'deu+eng';
      const text = await runTesseract(executable, [inputPath, 'stdout', '-l', languages]);
      const normalized = normalizeText(text);
      return normalized
        ? { status: 'completed', text: normalized, engine: this.id }
        : { status: 'unsupported', text: '', engine: this.id, error: 'Lokale OCR hat keinen Text erkannt.' };
    } catch (error) {
      return { status: 'unsupported', text: '', engine: this.id, error: normalizeError(error) };
    } finally {
      await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

function runTesseract(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on('data', (part: Buffer | string | Uint8Array) => stdout.push(Buffer.isBuffer(part) ? part : Buffer.from(part)));
    child.stderr?.on('data', (part: Buffer | string | Uint8Array) => stderr.push(Buffer.isBuffer(part) ? part : Buffer.from(part)));
    child.on('error', reject);
    child.on('close', (code: number | null) => {
      if (code === 0) resolve(Buffer.concat(stdout).toString('utf8'));
      else reject(new Error(Buffer.concat(stderr).toString('utf8') || `OCR-Prozess endete mit Code ${code}.`));
    });
  });
}

export class DocumentOcrService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly runner: DocumentOcrRunner = new LocalTesseractOcrRunner(),
    private readonly dataDirProvider: () => string = () => path.join(process.cwd(), 'data'),
  ) {}

  ensureSchema(): void {
    ensureDocumentOcrRuntimeSchema(this.database);
  }

  enqueueIfUseful(documentId: string): boolean {
    const row = this.database.prepare<DocumentOcrRow>('SELECT id, case_id, filename, mime_type, storage_path, document_key, iv, auth_tag, extracted_text, ocr_status FROM case_documents WHERE id = ?').get(documentId);
    if (!row) return false;
    if (!isOcrCandidate(row.filename, row.mime_type ?? undefined, row.extracted_text ?? undefined)) {
      this.database.prepare("UPDATE case_documents SET ocr_status = 'not_required' WHERE id = ? AND COALESCE(ocr_status, '') <> 'not_required'").run(documentId);
      return false;
    }
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO case_document_ocr_jobs (id, document_id, case_id, status, attempts, created_at, updated_at)
      VALUES (?, ?, ?, 'queued', 0, ?, ?)
      ON CONFLICT(document_id) DO UPDATE SET status = CASE WHEN status IN ('completed','processing') THEN status ELSE 'queued' END, updated_at = excluded.updated_at
    `).run(randomUUID(), row.id, row.case_id, timestamp, timestamp);
    this.database.prepare("UPDATE case_documents SET ocr_status = 'queued', ocr_error = NULL WHERE id = ?").run(row.id);
    return true;
  }

  async runPending(limit = 2): Promise<number> {
    const jobs = this.database.prepare<{ id: string; document_id: string; case_id: string; attempts: number }>(`
      SELECT id, document_id, case_id, attempts
      FROM case_document_ocr_jobs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT ?
    `).all(limit);
    let processed = 0;
    for (const job of jobs) {
      await this.processJob(job.id, job.document_id, job.case_id, job.attempts);
      processed += 1;
    }
    return processed;
  }

  private async processJob(jobId: string, documentId: string, caseId: string, attempts: number): Promise<void> {
    const startedAt = nowIso();
    this.database.prepare("UPDATE case_document_ocr_jobs SET status = 'processing', attempts = ?, updated_at = ? WHERE id = ?").run(attempts + 1, startedAt, jobId);
    this.database.prepare("UPDATE case_documents SET ocr_status = 'processing', ocr_started_at = ? WHERE id = ?").run(startedAt, documentId);
    const row = this.database.prepare<DocumentOcrRow>('SELECT id, case_id, filename, mime_type, storage_path, document_key, iv, auth_tag, extracted_text, ocr_status FROM case_documents WHERE id = ?').get(documentId);
    if (!row) {
      this.finishJob(jobId, documentId, 'failed', '', this.runner.id, 'Dokument wurde vor OCR-Lauf gelöscht.');
      return;
    }
    try {
      let result: DocumentOcrResult;
      if (this.runner.canRun(row)) {
        const plain = await this.decrypt(row);
        try {
          result = await this.runner.run(row, plain);
        } finally {
          plain.fill(0);
        }
      } else {
        result = { status: 'unsupported', text: '', engine: this.runner.id, error: 'Kein lokaler OCR-Runner für dieses Format verfügbar.' };
      }
      this.finishJob(jobId, documentId, result.status, result.text, result.engine, result.error);
      new SearchIndexService(this.database).reindexSource(result.status === 'completed' ? 'document_ocr' : 'document', documentId);
      if (result.status === 'completed') new SearchIndexService(this.database).reindexSource('document', documentId);
    } catch (error) {
      this.finishJob(jobId, documentId, 'failed', '', this.runner.id, normalizeError(error));
    }
  }

  private finishJob(jobId: string, documentId: string, status: DocumentOcrResult['status'], text: string, engine: string, error?: string): void {
    const completedAt = nowIso();
    const normalizedText = normalizeText(text);
    this.database.prepare(`
      UPDATE case_documents
      SET ocr_status = ?, ocr_text = ?, ocr_engine = ?, ocr_completed_at = ?, ocr_error = ?
      WHERE id = ?
    `).run(status, normalizedText || null, engine, completedAt, error ?? null, documentId);
    this.database.prepare('UPDATE case_document_ocr_jobs SET status = ?, last_error = ?, updated_at = ? WHERE id = ?').run(status, error ?? null, completedAt, jobId);
  }

  private decrypt(row: DocumentOcrRow): Promise<Buffer> {
    return new DocumentContainerService().readEncryptedContainer({
      storageRoot: this.dataDirProvider(),
      storagePath: row.storage_path,
      documentKey: row.document_key,
      iv: row.iv,
      authTag: row.auth_tag,
    });
  }
}
