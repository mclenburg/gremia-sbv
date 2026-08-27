import { describe, expect, it, vi } from 'vitest';
import { requestShellPathOpen } from '../../../electron/ipc/shellOpenPath';

describe('Betriebssystem-Pfadaufruf', () => {
  it('meldet nur eine leere Electron-openPath-Diagnose als angenommenen Auftrag', async () => {
    await expect(requestShellPathOpen('report.pdf', vi.fn(async () => ''))).resolves.toEqual({ opened: true });
  });

  it('gibt einen direkten Electron-openPath-Fehler sicher an die UI zurück', async () => {
    await expect(requestShellPathOpen('report.pdf', vi.fn(async () => 'No application associated'))).resolves.toEqual({
      opened: false,
      error: 'No application associated',
    });
  });

  it('fängt ausgelöste Ausnahme als nicht angenommenen Auftrag ab', async () => {
    await expect(requestShellPathOpen('report.pdf', vi.fn(async () => { throw new Error('spawn failed'); }))).resolves.toEqual({
      opened: false,
      error: 'spawn failed',
    });
  });
});
