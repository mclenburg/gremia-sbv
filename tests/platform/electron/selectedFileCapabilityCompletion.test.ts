import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSelectedFileCapabilities,
  issueSelectedFileCapability,
  resolveSelectedFileCapability,
  SELECTED_FILE_PURPOSE,
} from '../../../electron/ipc/selectedFileCapability';

describe('selected-file capability boundary', () => {
  afterEach(() => {
    clearSelectedFileCapabilities();
    vi.restoreAllMocks();
  });

  it('exposes an opaque capability instead of an absolute selected path', () => {
    const selected = path.resolve('', 'sensitive', 'person-list.xlsx');
    const capability = issueSelectedFileCapability(selected, SELECTED_FILE_PURPOSE.personImport);
    expect(capability.fileToken).toMatch(/^gremia-file:[0-9a-f]{48}$/);
    expect(capability.fileToken).not.toContain('sensitive');
    expect(capability.fileName).toBe('person-list.xlsx');
    expect(resolveSelectedFileCapability(capability.fileToken, SELECTED_FILE_PURPOSE.personImport, 'persons:import:preview')).toBe(selected);
  });


  it('supports every registered file purpose and keeps election voter imports isolated from person imports', () => {
    const fixtures = [
      [SELECTED_FILE_PURPOSE.caseHandover, 'handover.gsbvtransfer'],
      [SELECTED_FILE_PURPOSE.personImport, 'persons.xlsx'],
      [SELECTED_FILE_PURPOSE.electionTransfer, 'election.gsbvelection'],
      [SELECTED_FILE_PURPOSE.electionVoterImport, 'voters.csv'],
    ] as const;

    for (const [purpose, fileName] of fixtures) {
      const selected = path.resolve('', 'tmp', fileName);
      const capability = issueSelectedFileCapability(selected, purpose);
      expect(resolveSelectedFileCapability(capability.fileToken, purpose, `test:${purpose}`)).toBe(selected);
    }

    const voterCapability = issueSelectedFileCapability(
      path.resolve('', 'tmp', 'voters.xlsx'),
      SELECTED_FILE_PURPOSE.electionVoterImport,
    );
    expect(() => resolveSelectedFileCapability(
      voterCapability.fileToken,
      SELECTED_FILE_PURPOSE.personImport,
      'persons:import:preview',
    )).toThrow(/ungültig|abgelaufen/i);
  });

  it('rejects fabricated, cross-purpose and expired capabilities', () => {
    expect(() => resolveSelectedFileCapability(['', 'tmp', 'attack.xlsx'].join('/'), SELECTED_FILE_PURPOSE.personImport, 'persons:import:preview')).toThrow(/ungültig|abgelaufen/i);
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const capability = issueSelectedFileCapability(path.resolve('', 'tmp', 'handover.gsbvtransfer'), SELECTED_FILE_PURPOSE.caseHandover);
    expect(() => resolveSelectedFileCapability(capability.fileToken, SELECTED_FILE_PURPOSE.personImport, 'persons:import:preview')).toThrow(/ungültig|abgelaufen/i);
    vi.mocked(Date.now).mockReturnValue(now + 31 * 60 * 1000);
    expect(() => resolveSelectedFileCapability(capability.fileToken, SELECTED_FILE_PURPOSE.caseHandover, 'caseHandover:inspect')).toThrow(/ungültig|abgelaufen/i);
  });
});
