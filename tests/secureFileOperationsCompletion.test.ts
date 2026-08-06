import { closeSync, existsSync, fsyncSync, mkdtempSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { atomicWriteFileSync, type AtomicFileSystemOperations } from '../services/secureFileOperations';

describe('cross-platform atomic file replacement', () => {
  const directories: string[] = [];
  afterEach(() => {
    for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  function operations(rename: typeof renameSync): AtomicFileSystemOperations {
    return { closeSync, existsSync, fsyncSync, openSync, renameSync: rename, rmSync, writeFileSync };
  }

  it('uses the Windows-compatible replacement fallback and removes all sibling artifacts', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'gremia-atomic-win-'));
    directories.push(directory);
    const target = path.join(directory, 'security.json');
    writeFileSync(target, 'old');
    let firstReplacement = true;
    const windowsRename: typeof renameSync = (from, to) => {
      if (firstReplacement && to === target && existsSync(target)) {
        firstReplacement = false;
        const error = new Error('Windows does not replace existing files') as Error & { code: string };
        error.code = 'EEXIST';
        throw error;
      }
      return renameSync(from, to);
    };
    atomicWriteFileSync(target, 'new', 0o600, operations(windowsRename));
    expect(readFileSync(target, 'utf8')).toBe('new');
    expect(readdirSync(directory)).toEqual(['security.json']);
  });

  it('restores the old file when the second rename fails', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'gremia-atomic-rollback-'));
    directories.push(directory);
    const target = path.join(directory, 'security.json');
    writeFileSync(target, 'old');
    let calls = 0;
    const failingRename: typeof renameSync = (from, to) => {
      calls += 1;
      if (calls === 1) {
        const error = new Error('replace denied') as Error & { code: string };
        error.code = 'EPERM';
        throw error;
      }
      if (calls === 3) throw new Error('activation failed');
      return renameSync(from, to);
    };
    expect(() => atomicWriteFileSync(target, 'new', 0o600, operations(failingRename))).toThrow('activation failed');
    expect(readFileSync(target, 'utf8')).toBe('old');
    expect(readdirSync(directory)).toEqual(['security.json']);
  });
});
