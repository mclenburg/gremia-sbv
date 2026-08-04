import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('IPC-Laufzeitgrenze', () => {
  it('validiert die Argumentanzahl und ruft Handler ohne Tupel-Cast auf', () => {
    const source = readFileSync('electron/ipc/ipcHandler.ts', 'utf8');

    expect(source).toContain('assertIpcArgumentCount(channel, args, maximumArgumentCount)');
    expect(source).toContain('Reflect.apply(handler, undefined, [event, ...args])');
    expect(source).not.toMatch(/args\s+as\s+(?:unknown\s+as\s+)?Args/);
  });
});
