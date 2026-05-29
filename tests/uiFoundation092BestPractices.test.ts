import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { IndustrialFieldOption } from '../src/app/shared/components/IndustrialForm';

type UiFoundationBestPracticeSubject = IndustrialFieldOption;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

const processAndOverviewModules = [
  'src/app/features/bem/BemView.tsx',
  'src/app/features/bem/BemProcessDetail.tsx',
  'src/app/features/prevention/PreventionProcessDetail.tsx',
  'src/app/features/termination/TerminationView.tsx',
  'src/app/features/termination/TerminationProcessDetail.tsx',
  'src/app/features/equalization/EqualizationProcessDetail.tsx',
  'src/app/features/workplace-accommodation/WorkplaceAccommodationView.tsx',
  'src/app/features/workplace-accommodation/WorkplaceAccommodationProcessDetail.tsx',
  'src/app/features/participation/ParticipationView.tsx',
  'src/app/features/participation/ParticipationProcessDetail.tsx',
];

describe('UI-Fundament Best-Practice-Nachschärfung', () => {
  it('vermeidet Index-Keys in der zentralen Fehlerzusammenfassung', () => {
    const form = source('src/app/shared/components/IndustrialForm.tsx');

    expect(form).not.toContain('key={index}');
    expect(form).toContain('formErrorKey');
    expect(form).toContain('isValidElement');
  });

  it('führt Prozess- und Übersichtsmodule über zentrale Button-Komponenten', () => {
    for (const file of processAndOverviewModules) {
      const text = source(file);

      expect(text, file).not.toContain('<button');
      if (/IndustrialButton|ToolbarButton|GhostButton|DangerButton/.test(text)) {
        expect(text, file).toMatch(/IndustrialButton|ToolbarButton|GhostButton|DangerButton/);
      }
    }
  });
});
