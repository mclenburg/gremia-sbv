import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Benutzerhandbuch', () => {
  it('öffnet jedes im Inhaltsverzeichnis verlinkte Kapitel als lesbare Markdown-Datei', () => {
    const indexPath = resolve('docs/handbuch/README.md');
    const index = readFileSync(indexPath, 'utf8');
    const targets = Array.from(index.matchAll(/\[[^\]]+\]\(([^)]+)\)/g), ([, target]) => target);

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      const chapterPath = resolve(dirname(indexPath), target);
      expect(relative(dirname(indexPath), chapterPath).startsWith('..')).toBe(false);
      expect(existsSync(chapterPath), target).toBe(true);
      expect(statSync(chapterPath).isFile(), target).toBe(true);
      expect(readFileSync(chapterPath, 'utf8').trim().length, target).toBeGreaterThan(0);
    }
  });
});
