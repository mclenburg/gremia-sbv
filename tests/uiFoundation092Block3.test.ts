import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { IndustrialFieldOption } from '../src/app/shared/components/IndustrialForm';

type UiFoundationBlock3Subject = IndustrialFieldOption;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

const migratedProcessModules = [
  'src/app/features/bem/BemProcessDetail.tsx',
  'src/app/features/prevention/PreventionProcessDetail.tsx',
  'src/app/features/termination/TerminationProcessDetail.tsx',
  'src/app/features/equalization/EqualizationProcessDetail.tsx',
  'src/app/features/workplace-accommodation/WorkplaceAccommodationProcessDetail.tsx',
  'src/app/features/participation/ParticipationProcessDetail.tsx',
];

describe('UI-Fundament Block 3', () => {
  it('stellt Deferred-Formularfelder als zentrale Prozesskomponenten bereit', () => {
    const form = source('src/app/shared/components/IndustrialForm.tsx');

    expect(form).toContain('export function DeferredTextInput');
    expect(form).toContain('export function DeferredDateTimeInput');
    expect(form).toContain('export function DeferredTextareaInput');
    expect(form).toContain('onCommit');
    expect(form).toContain('industrial-input industrial-textarea-input');
  });

  it('migriert die sensiblen Prozessmodule auf zentrale Formularfelder', () => {
    for (const file of migratedProcessModules) {
      const text = source(file);

      expect(text).not.toContain("shared/textCommands/TextCommandTextarea");
      expect(text).toMatch(/SelectInput|DeferredTextInput|DeferredDateTimeInput|DeferredTextareaInput|CheckboxField/);
    }
  });

  it('speichert Gleichstellungsnotizen nicht mehr implizit beim Verlassen des Feldes', () => {
    const equalization = source('src/app/features/equalization/EqualizationProcessDetail.tsx');

    expect(equalization).toContain('Verschlüsselte Notiz speichern');
    expect(equalization).toContain('Verlassen des Feldes legt keine neue verschlüsselte Notiz mehr an');
    expect(equalization).not.toContain('onBlur={() => void saveSecureNote()}');
  });

  it('nutzt zentrale ToolbarButtons fuer Prozess-Dokumenten- und Vorschlagsaktionen', () => {
    const header = source('src/app/shared/process/ProcessDetailHeader.tsx');
    const bem = source('src/app/features/bem/BemProcessDetail.tsx');
    const termination = source('src/app/features/termination/TerminationProcessDetail.tsx');
    const equalization = source('src/app/features/equalization/EqualizationProcessDetail.tsx');

    expect(header).toContain('ToolbarButton');
    expect(bem).toContain('ToolbarButton');
    expect(termination).toContain('ToolbarButton');
    expect(equalization).toContain('ToolbarButton');
  });
});
