import { describe, expect, it } from 'vitest';
import { validateMobileReturnImportInput } from '../../../electron/ipc/mobileReturnIpcValidation';

describe('Mobile Rückgabe IPC-Grenze', () => {
  it('übernimmt ausschließlich bekannte Konfliktentscheidungen aus strukturierten Eingaben', () => {
    expect(validateMobileReturnImportInput({
      filePath: 'selected-file-capability',
      resolutions: [
        { mobileId: 'change-a', decision: 'keep_desktop' },
        { mobileId: 'change-b', decision: 'apply_mobile' },
      ],
    })).toEqual({
      filePath: 'selected-file-capability',
      resolutions: [
        { mobileId: 'change-a', decision: 'keep_desktop' },
        { mobileId: 'change-b', decision: 'apply_mobile' },
      ],
    });
    expect(() => validateMobileReturnImportInput({
      filePath: 'selected-file-capability', resolutions: [{ mobileId: 'change-a', decision: 'overwrite' }],
    })).toThrow(/Konfliktentscheidung/);
  });
});
