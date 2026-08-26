import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { modules } from '../../src/app/core/navigation/modules';

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

function hasAppVersionNumber(file: string): boolean {
  const content = readFileSync(file, 'utf8');
  return /\b(?:0\.9\.\d+|1\.0(?:\.0)?|1\.x|v0\.9\.\d+)\b/.test(content);
}

describe('aktive Markdown-Dokumentation', () => {
  it('führt öffentliche und dauerhafte Dokumentation ohne manuell gepflegte Versionspflicht', () => {
    const docs = ['README.md', 'CONTRIBUTING.md', ...collectMarkdownFiles('docs')];
    const classified = docs.map((file) => ({ file, kind: classifyMarkdownFile(file) }));

    expect(classified.some((entry) => entry.file === 'README.md' && entry.kind === 'public-core')).toBe(true);
    expect(classified.some((entry) => entry.file === 'docs/PRIVACY_AND_SECURITY.md' && entry.kind === 'internal-durable')).toBe(true);
    expect(docs.some(hasManualVersionStandLine)).toBe(false);
    expect(docs.some(hasAppVersionNumber)).toBe(false);
  });

  it('hält zentrale Navigation und Benutzerhandbuch bei Dokumentation, Sitzungen und Wahlen synchron', () => {
    const handbookIndex = readFileSync('docs/handbuch/README.md', 'utf8');
    const navigationGuide = readFileSync('docs/handbuch/02-grundbegriffe-und-navigation.md', 'utf8');
    const documentationGuide = readFileSync('docs/handbuch/14-dokumentation.md', 'utf8');
    const electionGuide = readFileSync('docs/handbuch/17-wahlen.md', 'utf8');

    expect(modules.find((module) => module.id === 'meetings')?.shortTitle).toBe('Sitzungen');
    expect(modules.find((module) => module.id === 'sbv_control')?.shortTitle).toBe('Dokumentation');
    expect(modules.find((module) => module.id === 'elections')?.shortTitle).toBe('Wahlen');
    expect(handbookIndex).toContain('[Dokumentation](14-dokumentation.md)');
    expect(handbookIndex).toContain('[Wahlen](17-wahlen.md)');
    expect(handbookIndex.indexOf('[Glossar](18-glossar.md)')).toBeGreaterThan(handbookIndex.indexOf('[Wahlen](17-wahlen.md)'));
    expect(navigationGuide).toContain('## Sitzungen');
    expect(navigationGuide).toContain('## Dokumentation');
    expect(navigationGuide).toContain('## Wahlen');
    expect(documentationGuide).toContain('## BR-Sitzung aus Gremia.BR übernehmen');
    expect(electionGuide).toContain('## Wahlworkflow');
  });

  it('verbannt Release- und Zwischenstandsdokumentation aus der aktiven Kerndoku', () => {
    const activeDocs = ['README.md', 'CONTRIBUTING.md', ...collectMarkdownFiles('docs')];
    const transientInCore = activeDocs.filter((file) => classifyMarkdownFile(file) === 'transient');

    expect(transientInCore).toEqual([]);
  });
});
