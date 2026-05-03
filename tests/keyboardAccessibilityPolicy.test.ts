import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('Keyboard- und Modal-Basisbedienung', () => {
  const keyboardSource = fs.readFileSync('src/app/core/keyboard/useModalKeyboardShortcuts.ts', 'utf8');
  const workflowSource = fs.readFileSync('src/app/workflowViews.tsx', 'utf8');

  it('registriert globale Shortcuts für Escape, Ctrl+N, Ctrl+F und Ctrl+Enter', () => {
    expect(keyboardSource).toContain("event.key === 'Escape'");
    expect(keyboardSource).toContain("event.key.toLowerCase() === 'n'");
    expect(keyboardSource).toContain("event.key.toLowerCase() === 'f'");
    expect(keyboardSource).toContain("event.key === 'Enter'");
  });

  it('implementiert eine Fokusfalle für Modals über Tab und Shift+Tab', () => {
    expect(keyboardSource).toContain("event.key === 'Tab'");
    expect(keyboardSource).toContain('last.focus()');
    expect(keyboardSource).toContain('first.focus()');
  });

  it('stellt Fallanlage und Suche per Custom Event für Shortcuts bereit', () => {
    expect(keyboardSource).toContain('gremia-sbv:create-case');
    expect(keyboardSource).toContain('gremia-sbv:focus-search');
    expect(workflowSource).toContain("window.addEventListener('gremia-sbv:create-case'");
  });
});
