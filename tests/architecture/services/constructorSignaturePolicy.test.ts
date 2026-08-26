import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function serviceSourceFiles(directory = join(process.cwd(), 'services')): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) return serviceSourceFiles(absolute);
    return entry.endsWith('.ts') && !entry.endsWith('.d.ts') ? [absolute] : [];
  });
}

describe('Konstruktor-Signaturen im Service-Layer', () => {
  it('vermeidet die uneinheitlichen Parameter-Namen db, dbProvider und getDb', () => {
    const offenders = serviceSourceFiles().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const matches = source.matchAll(/constructor\s*\([^)]*\b(?:db|dbProvider|getDb)\b/g);
      return Array.from(matches, () => relative(process.cwd(), file));
    });

    expect(offenders).toEqual([]);
  });
});
