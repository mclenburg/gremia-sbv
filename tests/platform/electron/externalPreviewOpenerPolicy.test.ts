import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const previewIpcFiles = [
  'electron/ipc/sbvOfficeWorkflowIpc.ts',
  'electron/ipc/sbvElectionIpc.ts',
  'electron/ipc/sbvParticipationViolationIpc.ts',
  'electron/ipc/templateIpc.ts',
];

describe('externe PDF-Vorschau-Policy', () => {
  it('nutzt in allen PDF-Vorschau-IPC-Modulen die zentrale Opener-Factory', () => {
    const offenders = previewIpcFiles.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return source.includes('shell.openPath') || !source.includes('createExternalPreviewOpener');
    });

    expect(offenders).toEqual([]);
  });
});
