import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteFileSync } from '../secureFileOperations.js';
import { decryptReportArchive, encryptReportArchive } from '../reports/reportArchiveCrypto.js';

const MAX_LEGACY_PDF_BYTES = 256 * 1024 * 1024;
const ENCRYPTED_EXPORT_EXTENSION = '.gsbvpdf';
const OTHER_PROTECTED_EXTENSION = '.gsbvdoc';

type DirectoryEntry = Pick<fs.Dirent, 'name' | 'isDirectory' | 'isFile' | 'isSymbolicLink'>;
type FileStatus = Pick<fs.Stats, 'isFile' | 'isSymbolicLink' | 'size'>;

export interface LegacyPlaintextExportCleanupOperations {
  readonly exists: (filePath: string) => boolean;
  readonly listDirectory: (directory: string) => DirectoryEntry[];
  readonly fileStatus: (filePath: string) => FileStatus;
  readonly readFile: (filePath: string) => Buffer;
  readonly writeAtomic: (filePath: string, content: string | Buffer, mode: number) => void;
  readonly restrictPermissions: (filePath: string, mode: number) => void;
  readonly removeFile: (filePath: string) => void;
}

export interface LegacyPlaintextExportCleanupResult {
  converted: number;
  recoveredExisting: number;
  invalidPdf: number;
  unsupported: number;
  symbolicLinks: number;
  failed: number;
  requiresReview: number;
}

const DEFAULT_OPERATIONS: LegacyPlaintextExportCleanupOperations = Object.freeze({
  exists: fs.existsSync,
  listDirectory: (directory: string) => fs.readdirSync(directory, { withFileTypes: true }),
  fileStatus: fs.lstatSync,
  readFile: (filePath: string) => fs.readFileSync(filePath),
  writeAtomic: atomicWriteFileSync,
  restrictPermissions: fs.chmodSync,
  removeFile: (filePath: string) => fs.rmSync(filePath, { force: false }),
});

function emptyResult(): LegacyPlaintextExportCleanupResult {
  return {
    converted: 0,
    recoveredExisting: 0,
    invalidPdf: 0,
    unsupported: 0,
    symbolicLinks: 0,
    failed: 0,
    requiresReview: 0,
  };
}

function destroyBuffer(buffer?: Buffer): void {
  try { buffer?.fill(0); } catch { /* Best-Effort-Speicherhygiene. */ }
}

function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).equals(Buffer.from('%PDF-', 'ascii'));
}

function encryptedExportPath(sourcePath: string): string {
  return `${sourcePath}${ENCRYPTED_EXPORT_EXTENSION}`;
}

export function buildLegacyPlaintextCleanupWarning(
  result: LegacyPlaintextExportCleanupResult,
): string | undefined {
  if (result.requiresReview === 0) return undefined;
  const oneFile = result.requiresReview === 1;
  const countLabel = oneFile ? '1 Datei' : `${result.requiresReview} Dateien`;
  const originalState = oneFile
    ? 'Die Originaldatei blieb unverändert und wird in der Datenschutzprüfung angezeigt.'
    : 'Die Originaldateien blieben unverändert und werden in der Datenschutzprüfung angezeigt.';
  return `Die automatische Klartextbereinigung konnte ${countLabel} nicht sicher abschließen. ${originalState} Beim nächsten Entsperren wird die sichere Überführung erneut versucht.`;
}

export class LegacyPlaintextExportCleanupService {
  private readonly operations: LegacyPlaintextExportCleanupOperations;

  constructor(overrides: Partial<LegacyPlaintextExportCleanupOperations> = {}) {
    this.operations = { ...DEFAULT_OPERATIONS, ...overrides };
  }

  cleanup(input: { dataDir: string; databaseKey: Buffer }): LegacyPlaintextExportCleanupResult {
    const result = emptyResult();
    const exportsDirectory = path.join(input.dataDir, 'exports');
    if (!this.operations.exists(exportsDirectory)) return result;
    this.walk(exportsDirectory, input.databaseKey, result);
    result.requiresReview = result.invalidPdf + result.unsupported + result.symbolicLinks + result.failed;
    return result;
  }

  private walk(
    directory: string,
    databaseKey: Buffer,
    result: LegacyPlaintextExportCleanupResult,
  ): void {
    let entries: DirectoryEntry[];
    try {
      entries = this.operations.listDirectory(directory);
    } catch {
      result.failed += 1;
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        result.symbolicLinks += 1;
      } else if (entry.isDirectory()) {
        this.walk(absolutePath, databaseKey, result);
      } else if (entry.isFile()) {
        this.processFile(absolutePath, entry.name, databaseKey, result);
      } else {
        result.unsupported += 1;
      }
    }
  }

  private processFile(
    sourcePath: string,
    fileName: string,
    databaseKey: Buffer,
    result: LegacyPlaintextExportCleanupResult,
  ): void {
    const extension = path.extname(fileName).toLowerCase();
    if (extension === ENCRYPTED_EXPORT_EXTENSION || extension === OTHER_PROTECTED_EXTENSION) return;
    if (extension !== '.pdf') {
      result.unsupported += 1;
      return;
    }

    let plaintext: Buffer | undefined;
    let newlyCreatedTarget = false;
    let targetVerified = false;
    const targetPath = encryptedExportPath(sourcePath);
    try {
      const status = this.operations.fileStatus(sourcePath);
      if (!status.isFile() || status.isSymbolicLink() || status.size > MAX_LEGACY_PDF_BYTES) {
        result.invalidPdf += 1;
        return;
      }
      plaintext = this.operations.readFile(sourcePath);
      if (!isPdf(plaintext)) {
        result.invalidPdf += 1;
        return;
      }

      if (this.operations.exists(targetPath)) {
        this.assertVerifiedTarget(targetPath, fileName, plaintext, databaseKey);
      } else {
        const envelope = encryptReportArchive(plaintext, fileName, databaseKey);
        this.operations.writeAtomic(targetPath, `${JSON.stringify(envelope, null, 2)}\n`, 0o600);
        newlyCreatedTarget = true;
        this.assertVerifiedTarget(targetPath, fileName, plaintext, databaseKey);
      }
      targetVerified = true;
      this.operations.restrictPermissions(targetPath, 0o600);
      this.assertSourceUnchanged(sourcePath, plaintext);
      this.operations.removeFile(sourcePath);
      if (newlyCreatedTarget) result.converted += 1;
      else result.recoveredExisting += 1;
    } catch {
      result.failed += 1;
      if (newlyCreatedTarget && !targetVerified) {
        try { this.operations.removeFile(targetPath); } catch { /* Originaldatei bleibt maßgeblich erhalten. */ }
      }
    } finally {
      destroyBuffer(plaintext);
    }
  }

  private assertVerifiedTarget(
    targetPath: string,
    expectedFileName: string,
    expectedPdf: Buffer,
    databaseKey: Buffer,
  ): void {
    const targetStatus = this.operations.fileStatus(targetPath);
    if (!targetStatus.isFile() || targetStatus.isSymbolicLink()) {
      throw new Error('Der verschlüsselte Zielpfad ist keine reguläre Datei.');
    }
    let decrypted: { pdf: Buffer; originalFileName: string } | undefined;
    try {
      decrypted = decryptReportArchive(this.operations.readFile(targetPath).toString('utf8'), databaseKey);
      if (decrypted.originalFileName !== expectedFileName || !decrypted.pdf.equals(expectedPdf)) {
        throw new Error('Der verschlüsselte Export stimmt nicht bytegenau mit dem Klartext-PDF überein.');
      }
    } finally {
      destroyBuffer(decrypted?.pdf);
    }
  }

  private assertSourceUnchanged(sourcePath: string, expectedPdf: Buffer): void {
    const status = this.operations.fileStatus(sourcePath);
    if (!status.isFile() || status.isSymbolicLink() || status.size !== expectedPdf.length) {
      throw new Error('Das Klartext-PDF wurde während der sicheren Überführung verändert.');
    }
    let current: Buffer | undefined;
    try {
      current = this.operations.readFile(sourcePath);
      if (!current.equals(expectedPdf)) {
        throw new Error('Das Klartext-PDF wurde während der sicheren Überführung verändert.');
      }
    } finally {
      destroyBuffer(current);
    }
  }
}
