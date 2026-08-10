import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const helper = require('../../../scripts/generate-third-party-licenses-fast.cjs') as {
  fileHashes(filePath: string): Set<string>;
  normalizedText(buffer: Buffer): string;
};

describe('Drittlizenz-Fingerprint', () => {
  it('ist unabhängig von LF- und CRLF-Checkout-Zeilenenden', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'gremia-license-fingerprint-'));
    try {
      const lf = path.join(dir, 'lf.txt');
      const crlf = path.join(dir, 'crlf.txt');
      writeFileSync(lf, 'alpha\nbeta\n', 'utf8');
      writeFileSync(crlf, 'alpha\r\nbeta\r\n', 'utf8');
      const lfHashes = helper.fileHashes(lf);
      const crlfHashes = helper.fileHashes(crlf);
      expect([...lfHashes].some((hash) => crlfHashes.has(hash))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('normalisiert auch einzelne CR-Zeilenenden deterministisch', () => {
    expect(helper.normalizedText(Buffer.from('a\rb\r', 'utf8'))).toBe('a\nb\n');
  });
});
