import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('Clean-Code-Refaktorierung 0.4.39', () => {
  it('hält App.tsx als schlanke Shell', () => {
    const source = readFileSync('src/app/App.tsx', 'utf8');
    const lineCount = source.split('\n').length;
    expect(lineCount).toBeLessThan(350);
    expect(source).toContain("from './workflowViews'");
  });

  it('lagert Fachansichten in separate View- oder Feature-Module aus', () => {
    expect(existsSync('src/app/workflowViews.tsx')).toBe(true);
    expect(readFileSync('src/app/workflowViews.tsx', 'utf8')).toContain('export function CasesView');
    expect(existsSync('src/app/features/templates/TemplatesView.tsx')).toBe(true);
    expect(existsSync('src/app/features/knowledge/KnowledgeView.tsx')).toBe(true);
  });

  it('enthält keine verschachtelten ZIP-Artefakte im Projektwurzelverzeichnis', () => {
    expect(existsSync('gremia-sbv.zip')).toBe(false);
  });
});
