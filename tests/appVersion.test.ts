import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import { APP_PACKAGE_NAME, APP_VERSION } from '../src/app/generated/appVersion';

describe('App-Versionsanzeige', () => {
  it('wird aus package.json erzeugt', () => {
    expect(APP_VERSION).toBe(packageJson.version);
    expect(APP_PACKAGE_NAME).toBe(packageJson.name);
  });

  it('verwendet eine semantisch lesbare Versionsnummer', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/);
  });
});
