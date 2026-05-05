import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TEXT_COMMAND_REGISTRY,
  findFirstTextCommand,
  getTextCommandKind,
  replaceCommandMarker,
  formatParticipationMarkerText,
  formatTemplateMarkerText
} from '../services/textCommandPolicy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('0.8.5-e Inline-Command-Master', () => {
  it('registers legacy symbols and live workflow aliases centrally', () => {
    const tokens = TEXT_COMMAND_REGISTRY.flatMap((definition) => definition.tokens);
    expect(tokens).toContain('//');
    expect(tokens).toContain('/fr');
    expect(tokens).toContain('/wv');
    expect(tokens).toContain('/bet');
    expect(tokens).toContain('/beteiligung');
    expect(tokens).toContain('/vl');
    expect(tokens).toContain('/vorlage');
    expect(getTextCommandKind('/bet')).toBe('participation');
    expect(getTextCommandKind('/vl')).toBe('template');
  });

  it('detects and replaces alias markers with the actual marker length', () => {
    const found = findFirstTextCommand('AG entscheidet ohne Unterrichtung. /bet');
    expect(found).toEqual({ token: '/bet', index: 35 });
    expect(replaceCommandMarker('Bitte /vl Unterlagen nutzen', 6, '/vl', formatTemplateMarkerText('Unterlagen')))
      .toContain('[Vorlage vormerken: Unterlagen]');
    expect(formatParticipationMarkerText('Versetzung ohne Anhörung')).toContain('SBV-Beteiligung angelegt');
  });

  it('keeps the Fallakte as creation context for Beteiligung commands', () => {
    const hook = read('src/app/features/cases/inlineCommands/useInlineCommands.ts');
    const overlay = read('src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx');
    expect(hook).toContain('bridge.participation.create');
    expect(hook).toContain('Beteiligungen werden immer als Maßnahme der aktuellen Fallakte angelegt');
    expect(overlay).toContain('Details können nach dem Gespräch ergänzt werden');
  });
});
