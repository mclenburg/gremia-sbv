import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readDiagramDocs(): string {
  return readFileSync('docs/ARCHITECTURE_DIAGRAMS.md', 'utf8');
}

function mermaidBlocks(markdown: string): string[] {
  return markdown
    .split('```mermaid')
    .slice(1)
    .map((part) => part.split('```')[0]?.trim() ?? '')
    .filter(Boolean);
}

function blockMentions(block: string, token: string): boolean {
  return block.includes(token);
}

describe('Architekturdiagramme 0.9.1', () => {
  it('dokumentieren den Datenfluss von React über Bridge und IPC bis SQLCipher', () => {
    const [dataFlow] = mermaidBlocks(readDiagramDocs());
    const expectedNodes = ['React UI', 'Preload Bridge', 'Electron IPC Handler', 'Node Services', 'Pure Policies', 'SQLCipher SQLite'];

    expect(Boolean(dataFlow)).toBe(true);
    expect(expectedNodes.every((node) => blockMentions(dataFlow, node))).toBe(true);
    expect(blockMentions(dataFlow, 'window.gremiaSbv')).toBe(true);
    expect(blockMentions(dataFlow, 'Audit / Hash Chain')).toBe(true);
    expect(blockMentions(dataFlow, 'Privacy Guards')).toBe(true);
  });

  it('zeigt die grobe Komponentensicht mit Fachmodulen und Querschnittsmodulen', () => {
    const blocks = mermaidBlocks(readDiagramDocs());
    const componentView = blocks[1] ?? '';
    const domainModules = ['Personenverzeichnis', 'Fallakten-Workbench', 'BEM', 'Prävention', 'Gleichstellung / GdB', 'Kündigungsanhörung', 'Arbeitsplatzgestaltung'];
    const supportModules = ['Fristen & iCal', 'Dokumente', 'Vorlagen', 'Wissensbasis', 'Compliance Center', 'Einstellungen, Backup, Portable'];

    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(domainModules.every((node) => blockMentions(componentView, node))).toBe(true);
    expect(supportModules.every((node) => blockMentions(componentView, node))).toBe(true);
    expect(blockMentions(componentView, 'SBV-Fachmodule')).toBe(true);
    expect(blockMentions(componentView, 'Querschnittsmodule')).toBe(true);
  });
});
