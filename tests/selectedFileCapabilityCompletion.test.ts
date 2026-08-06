import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSelectedFileCapabilities,
  issueSelectedFileCapability,
  resolveSelectedFileCapability,
} from '../electron/ipc/selectedFileCapability';

describe('selected-file capability boundary', () => {
  afterEach(() => {
    clearSelectedFileCapabilities();
    vi.restoreAllMocks();
  });

  it('exposes an opaque capability instead of an absolute selected path', () => {
    const selected = path.resolve('', 'sensitive', 'person-list.xlsx');
    const capability = issueSelectedFileCapability(selected, 'person-import');
    expect(capability.fileToken).toMatch(/^gremia-file:[0-9a-f]{48}$/);
    expect(capability.fileToken).not.toContain('sensitive');
    expect(capability.fileName).toBe('person-list.xlsx');
    expect(resolveSelectedFileCapability(capability.fileToken, 'person-import', 'persons:import:preview')).toBe(selected);
  });

  it('rejects fabricated, cross-purpose and expired capabilities', () => {
    expect(() => resolveSelectedFileCapability(['', 'tmp', 'attack.xlsx'].join('/'), 'person-import', 'persons:import:preview')).toThrow(/ungültig|abgelaufen/i);
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const capability = issueSelectedFileCapability(path.resolve('', 'tmp', 'handover.gsbvtransfer'), 'case-handover');
    expect(() => resolveSelectedFileCapability(capability.fileToken, 'person-import', 'persons:import:preview')).toThrow(/ungültig|abgelaufen/i);
    vi.mocked(Date.now).mockReturnValue(now + 31 * 60 * 1000);
    expect(() => resolveSelectedFileCapability(capability.fileToken, 'case-handover', 'caseHandover:inspect')).toThrow(/ungültig|abgelaufen/i);
  });
});
