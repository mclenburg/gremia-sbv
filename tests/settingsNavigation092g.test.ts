import { describe, expect, it } from 'vitest';
import { findSettingsSection, SETTINGS_SECTIONS } from '../src/app/features/settings/settingsNavigation';

describe('settings navigation 0.9.2-G', () => {
  it('offers tab targets for general settings and Gremia.BR without link-only cards', () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual(['settings-general', 'settings-gremia-br']);
    expect(findSettingsSection('settings-gremia-br')?.label).toBe('Gremia.BR');
  });

  it('keeps every settings tab target unique and addressable', () => {
    const uniqueTargets = new Set(SETTINGS_SECTIONS.map((section) => section.id));

    expect(uniqueTargets.size).toBe(SETTINGS_SECTIONS.length);
    expect([...uniqueTargets].every((id) => id.startsWith('settings-'))).toBe(true);
  });
});
