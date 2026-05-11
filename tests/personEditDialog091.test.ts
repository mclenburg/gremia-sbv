import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.9.1 Personenbearbeitung', () => {
  it('stellt einen Modal-Workflow zur manuellen Bearbeitung aller zentralen Personenfelder bereit', () => {
    const source = readFileSync('src/app/features/persons/PersonEditDialog.tsx', 'utf8');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    for (const label of ['Vorname', 'Nachname', 'Pseudonym/Label', 'Personalnummer', 'Dienstliche E-Mail', 'Organisationseinheit', 'Standort', 'Schutzstatus', 'Beschäftigungsstatus', 'Notiz']) {
      expect(source).toContain(label);
    }
  });
});
