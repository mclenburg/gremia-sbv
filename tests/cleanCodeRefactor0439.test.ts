import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Clean-Code-Refaktorierung 0.4.39', () => {
  it('hält App.tsx als schlanke Shell', () => {
    const source = readFileSync('src/app/App.tsx', 'utf8');
    const lineCount = source.split('\n').length;
    expect(lineCount).toBeLessThan(350);
    expect(source).toContain("from './workflowViews'");
  });

  it('lagert Fachansichten in ein separates View-Modul aus', () => {
    expect(existsSync('src/app/workflowViews.tsx')).toBe(true);
    const source = readFileSync('src/app/workflowViews.tsx', 'utf8');
    expect(source).toContain('export function CasesView');
    expect(source).toContain('export function TemplatesView');
    expect(source).toContain('export function KnowledgeView');
  });

  it('enthält keine verschachtelten ZIP-Artefakte im Projektwurzelverzeichnis', () => {
    expect(existsSync('gremia-sbv.zip')).toBe(false);
  });
});
