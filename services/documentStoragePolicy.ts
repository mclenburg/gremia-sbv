import path from 'node:path';

const CLEAR_TEXT_DOCUMENT_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|txt|csv|md|json|xml|rtf)$/i;
const ENCRYPTED_DOCUMENT_EXTENSION = '.gsbvdoc';

export interface DocumentStorageFinding {
  type: 'cleartext_file' | 'orphan_container' | 'missing_container' | 'path_escape' | 'unexpected_extension';
  riskLevel: 'info' | 'warning' | 'critical';
  path: string;
  message: string;
}

export function normalizeStoragePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function isTemporaryStoragePath(relativePath: string): boolean {
  const normalized = normalizeStoragePath(relativePath);
  return normalized === 'tmp' || normalized.startsWith('tmp/') || normalized.includes('/tmp/');
}

export function isBackupStoragePath(relativePath: string): boolean {
  const normalized = normalizeStoragePath(relativePath);
  return normalized === 'backups' || normalized.startsWith('backups/');
}

export function isEncryptedDocumentContainer(relativePath: string): boolean {
  return normalizeStoragePath(relativePath).toLowerCase().endsWith(ENCRYPTED_DOCUMENT_EXTENSION);
}

export function isLikelyCleartextDocument(relativePath: string): boolean {
  const normalized = normalizeStoragePath(relativePath);
  if (isEncryptedDocumentContainer(normalized)) return false;
  return CLEAR_TEXT_DOCUMENT_EXTENSIONS.test(normalized);
}

export function isPathInsideDirectory(candidatePath: string, parentDirectory: string): boolean {
  const relative = path.relative(path.resolve(parentDirectory), path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function shouldIncludePathInBackup(relativePath: string): boolean {
  const normalized = normalizeStoragePath(relativePath);
  if (!normalized || normalized.startsWith('../') || path.isAbsolute(normalized)) return false;
  if (isTemporaryStoragePath(normalized) || isBackupStoragePath(normalized)) return false;
  return true;
}

export function buildDocumentStorageFindings(input: {
  documentRoot: string;
  knownContainerPaths: string[];
  filesOnDisk: string[];
  missingContainerPaths?: string[];
}): DocumentStorageFinding[] {
  const known = new Set(input.knownContainerPaths.map(normalizeStoragePath));
  const disk = new Set(input.filesOnDisk.map(normalizeStoragePath));
  const findings: DocumentStorageFinding[] = [];

  for (const file of disk) {
    if (!isPathInsideDirectory(path.join(input.documentRoot, file), input.documentRoot)) {
      findings.push({ type: 'path_escape', riskLevel: 'critical', path: file, message: 'Dateipfad liegt außerhalb des Dokumentenspeichers.' });
      continue;
    }
    if (isLikelyCleartextDocument(file)) {
      findings.push({ type: 'cleartext_file', riskLevel: 'critical', path: file, message: 'Mögliche Klartextdatei im geschützten Dokumentenspeicher.' });
    }
    if (isEncryptedDocumentContainer(file) && !known.has(file)) {
      findings.push({ type: 'orphan_container', riskLevel: 'warning', path: file, message: 'Verschlüsselter Dokumentcontainer ohne Datenbankeintrag.' });
    }
    if (!isEncryptedDocumentContainer(file) && !isLikelyCleartextDocument(file) && !isTemporaryStoragePath(file)) {
      findings.push({ type: 'unexpected_extension', riskLevel: 'info', path: file, message: 'Unbekannter Dateityp im Dokumentenspeicher.' });
    }
  }

  for (const missing of input.missingContainerPaths ?? []) {
    findings.push({ type: 'missing_container', riskLevel: 'critical', path: normalizeStoragePath(missing), message: 'Datenbankeintrag verweist auf fehlenden Dokumentcontainer.' });
  }

  return findings.sort((a, b) => a.riskLevel.localeCompare(b.riskLevel) || a.path.localeCompare(b.path));
}
