import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('preload bridge contract', () => {
  it('exposes the knowledge bridge consistently in renderer typing, preload and main process', () => {
    const viteEnv = readFileSync('src/vite-env.d.ts', 'utf8');
    const preload = readFileSync('electron/preload.ts', 'utf8');
    const main = readFileSync('electron/main.ts', 'utf8');

    expect(viteEnv).toContain('knowledge: {');
    expect(viteEnv).toContain('listNorms(filters?: LegalNormSearchInput)');
    expect(viteEnv).toContain('linkNormToCase(input: LinkLegalNormToCaseInput)');

    expect(preload).toContain('knowledge: {');
    expect(preload).toContain("ipcRenderer.invoke('knowledge:norms:list'");
    expect(preload).toContain("ipcRenderer.invoke('knowledge:cases:link'");

    expect(main).toContain('registerKnowledgeIpc');
  });
});
