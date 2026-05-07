import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const roadmap = readFileSync('docs/ROADMAP.md', 'utf8');

describe('roadmap readiness', () => {
  it('uses the RC-ready roadmap structure', () => {
    expect(roadmap).toContain('## Aktueller Stand');
    expect(roadmap).toContain('## Vor RC1 offen');
    expect(roadmap).toContain('## Nach RC1');
    expect(roadmap).toContain('## Später / 1.x');
    expect(roadmap).toContain('## Historisch abgeschlossen');
  });

  it('does not keep old open 0.2 or 0.3 checkbox debt', () => {
    expect(roadmap).not.toMatch(/## Version 0\.2[\s\S]*- \[ \]/);
    expect(roadmap).not.toMatch(/## Version 0\.3[\s\S]*- \[ \]/);
    expect(roadmap).toContain('0.2 Prozessfundament: historisch abgeschlossen');
    expect(roadmap).toContain('0.3 Fristen und Wiedervorlagen: historisch abgeschlossen');
  });

  it('keeps the concept order: workflow extraction before live links', () => {
    expect(roadmap.indexOf('0.8.11 – `workflowViews.tsx` vollständig entkernen')).toBeGreaterThan(-1);
    expect(roadmap.indexOf('0.8.12 – Lebende Protokollverknüpfungen')).toBeGreaterThan(-1);
    const historical = roadmap.split('## Historisch abgeschlossen')[1] ?? '';
    expect(historical.indexOf('0.8.11 – `workflowViews.tsx` vollständig entkernen')).toBeLessThan(historical.indexOf('0.8.12 – Lebende Protokollverknüpfungen'));
    expect(roadmap).toContain('lebenden Protokollverknüpfungen als MVP in 0.8.12');
  });
});
