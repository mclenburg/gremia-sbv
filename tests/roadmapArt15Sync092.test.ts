import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Roadmap-Art.-15-Synchronität 0.9.2', () => {
  it('führt den Art.-15-Auskunftsexport nicht als späteres Feature', () => {
    const roadmap = readText('docs/ROADMAP.md');

    expect(roadmap).toContain('Stand: **0.9.2**');
    expect(roadmap).toContain('vorbefüllbarer und exportierbarer Arbeitsentwurf für Art.-15-Auskunftsersuchen');
    expect(roadmap).toContain('Personen-, Fallakten-, Fristen-, Maßnahmen-, Import-, Freitext- und Lifecycle-Daten');
    expect(roadmap).not.toContain('Vollständiger Art.-15-Auskunftsexport.');
    expect(roadmap).not.toContain('Ein vollständiger Auskunftsexport ist ein späteres 1.x-Thema');
    expect(roadmap).not.toContain('Automatisierte Vorbefüllung des Art.-15-Auskunftsentwurfs');
  });

  it('grenzt implementierten Arbeitsentwurf und organisatorische Freigabe sauber ab', () => {
    const roadmap = readText('docs/ROADMAP.md');
    const privacyConcept = readText('docs/DATENSCHUTZKONZEPT.md');
    const gdprGuide = readText('docs/DSGVO_SBV.md');

    for (const text of [roadmap, privacyConcept, gdprGuide]) {
      expect(text).toMatch(/Identitätsprüfung/);
      expect(text).toMatch(/Drittdaten/);
      expect(text).toMatch(/Schwärzung/);
    }
  });
});
