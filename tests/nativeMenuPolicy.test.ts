import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mainSource = readFileSync(join(process.cwd(), 'electron', 'main.ts'), 'utf8');

describe('native Electron menu policy', () => {
  it('removes the native application menu by default', () => {
    expect(mainSource).toContain('Menu.setApplicationMenu(null)');
  });

  it('hides and auto-hides the window menu bar', () => {
    expect(mainSource).toContain('win.setMenuBarVisibility(false)');
    expect(mainSource).toContain('win.setAutoHideMenuBar(true)');
  });

  it('keeps a documented developer escape hatch', () => {
    expect(mainSource).toContain('GREMIA_SBV_SHOW_MENU');
  });
});
