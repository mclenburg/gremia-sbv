import { describe, expect, it } from 'vitest';
import { TEXT_COMMAND_HELP_GROUPS, TEXT_COMMAND_REGISTRY, TEXT_COMMAND_HINT, tokensForTextCommandKind } from '../services/textCommandPolicy';
import { readFileSync } from 'node:fs';

describe('0.8.6-a inline command alignment', () => {
  it('registers quick commands for all core case measure types', () => {
    expect(tokensForTextCommandKind('bem_measure')).toContain('/bem');
    expect(tokensForTextCommandKind('prevention_measure')).toEqual(expect.arrayContaining(['/praev', '/prävention', '/praevention']));
    expect(tokensForTextCommandKind('participation')).toEqual(expect.arrayContaining(['/bet', '/beteiligung']));
    expect(tokensForTextCommandKind('termination_measure')).toEqual(expect.arrayContaining(['/kuend', '/kündigung', '/kuendigung']));
    expect(tokensForTextCommandKind('equalization_measure')).toEqual(expect.arrayContaining(['/gleich', '/gdb']));
    expect(tokensForTextCommandKind('workplace_accommodation')).toEqual(expect.arrayContaining(['/anp', '/anpassung', '/arbeitsplatz']));
  });

  it('moves the long explanation out of text fields into Ctrl+H help', () => {
    expect(TEXT_COMMAND_HINT).toBe('Strg+H zeigt alle Kurzbefehle');
    const textarea = readFileSync('src/app/shared/textCommands/TextCommandTextarea.tsx', 'utf8');
    expect(textarea).toContain('Strg+H: Kurzbefehle anzeigen');
    expect(textarea).not.toContain('// oder /fr Frist · /wv Wiedervorlage');
  });

  it('provides grouped command help for Ctrl+H', () => {
    const help = readFileSync('src/app/shared/textCommands/TextCommandHelpModal.tsx', 'utf8');
    expect(help).toContain("event.key.toLowerCase() === 'h'");
    expect(help).toContain('TEXT_COMMAND_HELP_GROUPS');
    expect(TEXT_COMMAND_HELP_GROUPS.some((group) => group.kinds.includes('bem_measure'))).toBe(true);
    expect(TEXT_COMMAND_HELP_GROUPS.some((group) => group.kinds.includes('workplace_accommodation'))).toBe(true);
  });

  it('keeps command definitions centralized', () => {
    const kinds = new Set(TEXT_COMMAND_REGISTRY.map((definition) => definition.kind));
    expect(kinds.has('bem_measure')).toBe(true);
    expect(kinds.has('prevention_measure')).toBe(true);
    expect(kinds.has('termination_measure')).toBe(true);
    expect(kinds.has('equalization_measure')).toBe(true);
  });
});
