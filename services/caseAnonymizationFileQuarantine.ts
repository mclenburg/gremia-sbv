import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isPathInside, listFilesRecursive } from './retentionSupport.js';

export interface AnonymizationFileRow {
  id: string;
  storage_path?: string | null;
}

type QuarantinedFile = {
  originalPath: string;
  quarantinePath: string;
};

/**
 * Moves all original case files out of their live locations before database
 * anonymization starts. The move is reversible until commit() permanently
 * removes the quarantine directory.
 */
export class CaseAnonymizationFileQuarantine {
  private readonly dataRoot: string;
  private readonly caseDirectory: string;
  private readonly quarantineRoot: string;
  private readonly quarantinedGeneratedFiles: QuarantinedFile[] = [];
  private caseDirectoryQuarantined = false;
  private stagedFileCount = 0;

  constructor(dataDir: string, private readonly caseId: string) {
    this.dataRoot = path.resolve(dataDir);
    this.caseDirectory = path.resolve(this.dataRoot, 'documents', caseId);
    this.quarantineRoot = path.resolve(this.dataRoot, '.anonymization-quarantine', `${caseId}-${randomUUID()}`);
  }

  get root(): string {
    return this.quarantineRoot;
  }

  get affectedFiles(): number {
    return this.stagedFileCount;
  }

  stage(uploadedDocuments: readonly AnonymizationFileRow[], generatedDocuments: readonly AnonymizationFileRow[]): void {
    this.assertUploadedPaths(uploadedDocuments);
    fs.mkdirSync(this.quarantineRoot, { recursive: true });

    if (fs.existsSync(this.caseDirectory)) {
      const files = listFilesRecursive(this.caseDirectory);
      const target = path.join(this.quarantineRoot, 'case-documents');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.renameSync(this.caseDirectory, target);
      this.caseDirectoryQuarantined = true;
      this.stagedFileCount += files.length;
    }

    let generatedIndex = 0;
    for (const document of generatedDocuments) {
      if (!document.storage_path) continue;
      const originalPath = path.resolve(document.storage_path);
      if (!isPathInside(this.dataRoot, originalPath)) {
        throw new Error(`Generierter Dokumentpfad liegt außerhalb des Datentresors: ${document.id}`);
      }
      if (isPathInside(this.caseDirectory, originalPath)) continue;
      if (!fs.existsSync(originalPath)) continue;
      const quarantinePath = path.join(this.quarantineRoot, 'generated', `${generatedIndex}-${path.basename(originalPath)}`);
      generatedIndex += 1;
      fs.mkdirSync(path.dirname(quarantinePath), { recursive: true });
      fs.renameSync(originalPath, quarantinePath);
      this.quarantinedGeneratedFiles.push({ originalPath, quarantinePath });
      this.stagedFileCount += 1;
    }
  }

  rollback(removeReplacementCaseDirectory = false): void {
    const liveCaseDirectory = this.caseDirectory;
    if ((this.caseDirectoryQuarantined || removeReplacementCaseDirectory) && fs.existsSync(liveCaseDirectory)) {
      fs.rmSync(liveCaseDirectory, { recursive: true, force: true });
    }
    if (this.caseDirectoryQuarantined) {
      const quarantinedCaseDirectory = path.join(this.quarantineRoot, 'case-documents');
      if (fs.existsSync(quarantinedCaseDirectory)) {
        fs.mkdirSync(path.dirname(liveCaseDirectory), { recursive: true });
        fs.renameSync(quarantinedCaseDirectory, liveCaseDirectory);
      }
    }

    for (const entry of this.quarantinedGeneratedFiles) {
      if (!fs.existsSync(entry.quarantinePath)) continue;
      if (fs.existsSync(entry.originalPath)) fs.rmSync(entry.originalPath, { force: true });
      fs.mkdirSync(path.dirname(entry.originalPath), { recursive: true });
      fs.renameSync(entry.quarantinePath, entry.originalPath);
    }

    if (fs.existsSync(this.quarantineRoot)) fs.rmSync(this.quarantineRoot, { recursive: true, force: true });
  }

  commit(): void {
    if (fs.existsSync(this.quarantineRoot)) fs.rmSync(this.quarantineRoot, { recursive: true, force: true });
    if (fs.existsSync(this.quarantineRoot)) throw new Error('Dateiquarantäne konnte nicht vollständig gelöscht werden.');
  }

  private assertUploadedPaths(documents: readonly AnonymizationFileRow[]): void {
    for (const document of documents) {
      if (!document.storage_path) continue;
      const absolute = path.resolve(document.storage_path);
      if (!isPathInside(this.caseDirectory, absolute)) {
        throw new Error(`Dokumentpfad liegt außerhalb des Fall-Tresors: ${document.id}`);
      }
    }
  }
}
