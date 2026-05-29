import { describe, expect, it } from 'vitest';
import { findSettingsSection, SETTINGS_SECTIONS } from '../src/app/features/settings/settingsNavigation';

describe('settings navigation', () => {
  it('gliedert Einstellungen in fachliche 1.0-Bereiche', () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual([
      'settings-general',
      'settings-security',
      'settings-data-protection',
      'settings-templates',
      'settings-gremia-br',
    ]);
    expect(findSettingsSection('settings-gremia-br')?.label).toBe('Gremia.BR');
    expect(findSettingsSection('settings-security')?.description).toContain('Backup');
    expect(findSettingsSection('settings-data-protection')?.label).toBe('Datenschutz');
  });
});
