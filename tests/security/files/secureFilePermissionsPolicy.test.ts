import { describe, expect, it } from 'vitest';
import {
  isOwnerOnlyDirectoryMode,
  isOwnerOnlyFileMode,
  OWNER_ONLY_DIRECTORY_MODE,
  OWNER_ONLY_FILE_MODE,
  supportsPosixPermissionBits,
} from '../../../services/secureFilePermissions';

describe('plattformbewusste Dateirechte-Policy', () => {
  it('modelliert Owner-only POSIX-Modi zentral', () => {
    expect(isOwnerOnlyFileMode(OWNER_ONLY_FILE_MODE)).toBe(true);
    expect(isOwnerOnlyDirectoryMode(OWNER_ONLY_DIRECTORY_MODE)).toBe(true);
    expect(isOwnerOnlyFileMode(0o666)).toBe(false);
    expect(isOwnerOnlyDirectoryMode(0o777)).toBe(false);
  });

  it('behandelt Windows nicht als POSIX-Dateirechte-Plattform', () => {
    expect(supportsPosixPermissionBits('linux')).toBe(true);
    expect(supportsPosixPermissionBits('darwin')).toBe(true);
    expect(supportsPosixPermissionBits('win32')).toBe(false);
  });
});
