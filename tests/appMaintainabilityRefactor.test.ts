import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync('src/app/App.tsx', 'utf8');

describe('App Wartbarkeits-Schnitt', () => {
  it('lagert Navigation und Placeholder aus App.tsx aus', () => {
    expect(existsSync('src/app/shell/ShellNav.tsx')).toBe(true);
    expect(existsSync('src/app/shared/components/PlaceholderView.tsx')).toBe(true);
    expect(appSource).not.toContain('function ShellNav(');
    expect(appSource).not.toContain('function PlaceholderView(');
  });

  it('lagert den globalen Modal-Keyboard-Code in einen Hook aus', () => {
    expect(existsSync('src/app/core/keyboard/useModalKeyboardShortcuts.ts')).toBe(true);
    expect(appSource).toContain('useModalKeyboardShortcuts({ setCurrentView });');
    expect(appSource).not.toContain('function getTopModal()');
  });

  it('führt Moduldefinitionen zentral statt inline in App.tsx', () => {
    expect(existsSync('src/app/core/navigation/modules.ts')).toBe(true);
    expect(appSource).not.toContain('const modules: ModuleDefinition[] =');
  });
});
