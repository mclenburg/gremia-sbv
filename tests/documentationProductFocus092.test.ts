import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('product documentation 0.9.2', () => {
  it('beschreibt Fallübergabe als Produktfunktion statt als Patchnotiz', () => {
    const handover = read('docs/CASE_HANDOVER_TRANSFER.md');
    const roadmap = read('docs/ROADMAP.md');
    const readme = read('README.md');

    for (const text of [handover, roadmap, readme]) {
      expect(text).toMatch(/Fallübergabe|Übergabe/);
      expect(text).toMatch(/Vertretung|Nachfolge|Urlaub/);
      expect(text).not.toMatch(/fix\d+|Patch herunterladen|Review-Fix/i);
    }
  });

  it('dokumentiert die fachlichen Sicherheitsgrenzen der Übergabe', () => {
    const handover = read('docs/CASE_HANDOVER_TRANSFER.md');
    const privacy = read('docs/PRIVACY_AND_SECURITY.md');
    const gdpr = read('docs/DSGVO_SBV.md');

    for (const text of [handover, privacy, gdpr]) {
      expect(text).toMatch(/keine automatische|keine.*Synchronisation/i);
      expect(text).toMatch(/abgelaufene.*(nicht importier|dürfen nicht importiert)/i);
      expect(text).toMatch(/Audit|auditiert/i);
      expect(text).not.toMatch(/Personennamen.*Audit.*protokolliert/i);
    }

    expect(handover).toContain('Jede Gremia.SBV-Instanz bleibt eigenständig');
    expect(handover).toContain('Datei und Passphrase getrennt übermitteln');
  });

  it('führt das neue Dauerdokument im Dokumentationsindex', () => {
    const docsIndex = read('docs/README.md');

    expect(docsIndex).toContain('CASE_HANDOVER_TRANSFER.md');
    expect(docsIndex).toContain('verschlüsselte Fallübergabe');
    expect(docsIndex).not.toContain('Patch herunterladen');
  });
});
