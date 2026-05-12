import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type DiagramReference = {
  alt: string;
  assetPath: string;
  sourcePath: string;
};

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function collectDiagramReferences(markdown: string): DiagramReference[] {
  const imageMatches = Array.from(markdown.matchAll(/!\[([^\]]+)\]\((\.\/assets\/[^)]+\.svg)\)/g));
  const sourceMatches = Array.from(markdown.matchAll(/\[`docs\/mermaid\/([^`]+\.mmd)`\]\((\.\/mermaid\/[^)]+\.mmd)\)/g));

  return imageMatches.map((image, index) => ({
    alt: image[1] ?? '',
    assetPath: `docs/${(image[2] ?? '').replace(/^\.\//, '')}`,
    sourcePath: `docs/${(sourceMatches[index]?.[2] ?? '').replace(/^\.\//, '')}`,
  }));
}

function mermaidNodeLabels(source: string): string[] {
  return Array.from(source.matchAll(/\["([^"\]]+)"\]/g)).map((match) => (match[1] ?? '').replace(/\\n/g, '\n'));
}

function svgMetadata(path: string): { hasSvgRoot: boolean; title: string; description: string } {
  const svg = readText(path);
  return {
    hasSvgRoot: svg.trimStart().startsWith('<svg '),
    title: svg.match(/<title id="title">([^<]+)<\/title>/)?.[1] ?? '',
    description: svg.match(/<desc id="desc">([^<]+)<\/desc>/)?.[1] ?? '',
  };
}

describe('Architekturdiagramme 0.9.1', () => {
  it('bindet gerenderte SVGs ein und hält die Mermaid-Quellen separat versionierbar', () => {
    const references = collectDiagramReferences(readText('docs/ARCHITECTURE_DIAGRAMS.md'));

    expect(references.map((ref) => ref.assetPath)).toEqual([
      'docs/assets/architecture-data-flow.svg',
      'docs/assets/architecture-components.svg',
    ]);
    expect(references.map((ref) => ref.sourcePath)).toEqual([
      'docs/mermaid/architecture-data-flow.mmd',
      'docs/mermaid/architecture-components.mmd',
    ]);
    expect(references.every((ref) => existsSync(ref.assetPath) && existsSync(ref.sourcePath))).toBe(true);
  });

  it('dokumentiert den Datenfluss von React über Bridge und IPC bis SQLCipher als Quelle und Bild', () => {
    const source = readText('docs/mermaid/architecture-data-flow.mmd');
    const labels = mermaidNodeLabels(source);
    const metadata = svgMetadata('docs/assets/architecture-data-flow.svg');
    const requiredLabels = ['React UI\nFeature-Views, Panels, Dialoge', 'Preload Bridge\nwindow.gremiaSbv', 'Electron IPC Handler\nvalidierte Kanalgrenzen', 'Node Services\nfachliche Orchestrierung', 'Pure Policies\nRegeln ohne DB-Zugriff', 'SQLCipher SQLite\nverschlüsselte lokale Datenbank'];

    expect(source.trim().startsWith('flowchart TD')).toBe(true);
    expect(requiredLabels.every((label) => labels.some((actual) => actual === label))).toBe(true);
    expect(metadata).toEqual({
      hasSvgRoot: true,
      title: 'Datenfluss UI bis Datenbank',
      description: 'Visualisiert den Weg von React UI über Preload Bridge, IPC, Services und Policies bis zur lokalen SQLCipher-Datenbank.',
    });
  });

  it('zeigt die grobe Komponentensicht mit Fachmodulen und Querschnittsmodulen als Quelle und Bild', () => {
    const source = readText('docs/mermaid/architecture-components.mmd');
    const labels = mermaidNodeLabels(source);
    const metadata = svgMetadata('docs/assets/architecture-components.svg');
    const domainLabels = ['Personenverzeichnis', 'Fallakten-Workbench', 'BEM', 'Prävention', 'Gleichstellung / GdB', 'Kündigungsanhörung', 'Arbeitsplatzgestaltung'];
    const supportLabels = ['Fristen & iCal', 'Dokumente', 'Vorlagen', 'Wissensbasis', 'Compliance Center', 'Einstellungen, Backup, Portable'];

    expect(source.trim().startsWith('flowchart LR')).toBe(true);
    expect(domainLabels.every((label) => labels.some((actual) => actual === label || actual.startsWith(`${label}\n`)))).toBe(true);
    expect(supportLabels.every((label) => labels.some((actual) => actual === label || actual.startsWith(`${label}\n`)))).toBe(true);
    expect(metadata).toEqual({
      hasSvgRoot: true,
      title: 'Grobe Komponentensicht',
      description: 'Zeigt Core, SBV-Fachmodule, Querschnittsmodule, Security und Persistenz der Anwendung.',
    });
  });
});
