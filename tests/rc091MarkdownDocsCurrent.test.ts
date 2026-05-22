import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function collectMarkdownFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      result.push(...collectMarkdownFiles(path));
    } else if (entry.endsWith('.md')) {
      result.push(path.replace(/\\/g, '/'));
    }
  }
  return result.sort();
}

function classifyMarkdownFile(path: string): 'public-core' | 'internal-durable' | 'transient' {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  if (normalized === 'readme.md' || normalized === 'contributing.md') {
    return 'public-core';
  }
  if (normalized.startsWith('docs/') && !normalized.includes('release') && !normalized.includes('patch')) {
    return 'internal-durable';
  }
  return 'transient';
}

function hasManualVersionStandLine(file: string): boolean {
  return /stand:\s*\*\*\d+\.\d+\.\d+/.test(readFileSync(file, 'utf8'));
}

describe('0.9.2 aktive Markdown-Dokumentation', () => {
  it('führt öffentliche und dauerhafte Dokumentation ohne manuell gepflegte Versionspflicht', () => {
    const docs = ['README.md', 'CONTRIBUTING.md', ...collectMarkdownFiles('docs')];
    const classified = docs.map((file) => ({ file, kind: classifyMarkdownFile(file) }));

    expect(classified.some((entry) => entry.file === 'README.md' && entry.kind === 'public-core')).toBe(true);
    expect(classified.some((entry) => entry.file === 'docs/PRIVACY_AND_SECURITY.md' && entry.kind === 'internal-durable')).toBe(true);
    expect(docs.some(hasManualVersionStandLine)).toBe(false);
  });

  it('verbannt Release- und Zwischenstandsdokumentation aus der aktiven Kerndoku', () => {
    const activeDocs = ['README.md', 'CONTRIBUTING.md', ...collectMarkdownFiles('docs')];
    const transientInCore = activeDocs.filter((file) => classifyMarkdownFile(file) === 'transient');

    expect(transientInCore).toEqual([]);
  });
});
