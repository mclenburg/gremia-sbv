import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  findFirstTextCommand,
  getTextCommandArgument,
  getTextCommandRangeLength,
  isTextCommandAt,
  replaceCommandMarker
} from '../services/textCommandPolicy';

describe('0.8.6-d inline overlay stabilization', () => {
  it('detects slash commands only on command boundaries', () => {
    expect(findFirstTextCommand('AG: /bet Versetzung ohne Anhörung')).toEqual({ token: '/bet', index: 4 });
    expect(findFirstTextCommand('Pfad /betrieblich ist kein registrierter Befehl')).toBeNull();
    expect(isTextCommandAt('Text /anp fester Arbeitsplatz', 5, '/anp')).toBe(true);
  });

  it('extracts command arguments and can replace the whole command segment', () => {
    const text = 'AG sagt /bet Versetzung ohne Anhörung\nWeiterer Satz';
    const command = findFirstTextCommand(text)!;
    expect(getTextCommandArgument(text, command.index, command.token)).toBe('Versetzung ohne Anhörung');
    const range = getTextCommandRangeLength(text, command.index, command.token);
    expect(replaceCommandMarker(text, command.index, command.token, 'SBV-Beteiligung angelegt: Versetzung ohne Anhörung', range))
      .toContain('SBV-Beteiligung angelegt: Versetzung ohne Anhörung\nWeiterer Satz');
  });

  it('makes global command overlays keyboard friendly and argument aware', () => {
    const controller = readFileSync('src/app/shared/textCommands/GlobalTextCommandController.tsx', 'utf8');
    expect(controller).toContain('getTextCommandArgument');
    expect(controller).toContain('getTextCommandRangeLength');
    expect(controller).toContain('rangeLength: draft.rangeLength');
    expect(controller).toContain('Strg+Enter speichert');
    expect(controller).toContain('onKeyDown={handleDialogKeyDown}');
  });

  it('provides searchable, focus-managed Ctrl+H command help', () => {
    const help = readFileSync('src/app/shared/textCommands/TextCommandHelpModal.tsx', 'utf8');
    const css = readFileSync('src/app/shared/textCommands/textCommandHelp.css', 'utf8');
    expect(help).toContain('Kurzbefehle durchsuchen');
    expect(help).toContain('focusableElements');
    expect(help).toContain('searchRef.current?.focus()');
    expect(help).toContain("event.key === 'Tab'");
    expect(css).toContain('.text-command-help-search');
  });
});
