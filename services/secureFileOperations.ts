import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export interface AtomicFileSystemOperations {
  readonly closeSync: typeof closeSync;
  readonly existsSync: typeof existsSync;
  readonly fsyncSync: typeof fsyncSync;
  readonly openSync: typeof openSync;
  readonly renameSync: typeof renameSync;
  readonly rmSync: typeof rmSync;
  readonly writeFileSync: typeof writeFileSync;
}

const DEFAULT_ATOMIC_FILE_SYSTEM: AtomicFileSystemOperations = Object.freeze({
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
});

function uniqueSibling(filePath: string, suffix: string): string {
  return path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(6).toString('hex')}.${suffix}`,
  );
}

function replaceFileSync(
  temporaryPath: string,
  filePath: string,
  fileSystem: AtomicFileSystemOperations,
): void {
  try {
    fileSystem.renameSync(temporaryPath, filePath);
    return;
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : '';
    if (!fileSystem.existsSync(filePath) || !['EEXIST', 'EPERM', 'EACCES'].includes(code)) throw error;
  }

  const previousPath = uniqueSibling(filePath, 'previous');
  fileSystem.renameSync(filePath, previousPath);
  try {
    fileSystem.renameSync(temporaryPath, filePath);
    fileSystem.rmSync(previousPath, { force: true });
  } catch (error) {
    try {
      if (fileSystem.existsSync(filePath)) fileSystem.rmSync(filePath, { force: true });
      if (fileSystem.existsSync(previousPath)) fileSystem.renameSync(previousPath, filePath);
    } catch {
      // Der ursprüngliche Ersetzungsfehler bleibt maßgeblich.
    }
    throw error;
  }
}

export function atomicWriteFileSync(
  filePath: string,
  content: string | Buffer,
  mode = 0o600,
  fileSystem: AtomicFileSystemOperations = DEFAULT_ATOMIC_FILE_SYSTEM,
): void {
  const temporaryPath = uniqueSibling(filePath, 'tmp');
  let descriptor: number | undefined;
  try {
    descriptor = fileSystem.openSync(temporaryPath, 'wx', mode);
    fileSystem.writeFileSync(descriptor, content);
    fileSystem.fsyncSync(descriptor);
    fileSystem.closeSync(descriptor);
    descriptor = undefined;
    replaceFileSync(temporaryPath, filePath, fileSystem);
  } catch (error) {
    if (descriptor !== undefined) {
      try { fileSystem.closeSync(descriptor); } catch { /* best effort */ }
    }
    fileSystem.rmSync(temporaryPath, { force: true });
    throw error;
  }
}


export interface AtomicArtifactCommitTarget {
  readonly path: string;
  readonly content: string | Buffer;
}

export function commitAtomicArtifacts(
  targets: readonly AtomicArtifactCommitTarget[],
  write: (filePath: string, content: string | Buffer) => void = atomicWriteFileSync,
): void {
  const previous = targets.map(({ path: filePath }) => ({
    filePath,
    content: existsSync(filePath) ? readFileSync(filePath) : undefined,
  }));
  try {
    for (const target of targets) write(target.path, target.content);
  } catch (error) {
    for (const entry of previous) {
      try {
        if (entry.content) write(entry.filePath, entry.content);
        else rmSync(entry.filePath, { force: true });
      } catch {
        // Der erste Schreibfehler bleibt maßgeblich.
      }
    }
    throw error;
  }
}

