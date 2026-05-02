import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('Keyboard- und Modal-Basisbedienung', () => {
  const appSource = fs.readFileSync('src/app/App.tsx', 'utf8');

  it('registriert globale Shortcuts für Escape, Ctrl+N, Ctrl+F und Ctrl+Enter', () => {
    expect(appSource).toContain("event.key === 'Escape'");
    expect(appSource).toContain("event.key.toLowerCase() === 'n'");
    expect(appSource).toContain("event.key.toLowerCase() === 'f'");
    expect(appSource).toContain("event.key === 'Enter'");
  });

  it('implementiert eine Fokusfalle für Modals über Tab und Shift+Tab', () => {
    expect(appSource).toContain("event.key === 'Tab'");
    expect(appSource).toContain('last.focus()');
    expect(appSource).toContain('first.focus()');
  });

  it('stellt Fallanlage und Suche per Custom Event für Shortcuts bereit', () => {
    expect(appSource).toContain('gremia-sbv:create-case');
    expect(appSource).toContain('gremia-sbv:focus-search');
    expect(appSource).toContain("import { ModuleFrame } from './shared/components/ModuleFrame';");
  });
});
