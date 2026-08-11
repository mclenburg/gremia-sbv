import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IndustrialFieldOption } from '../../src/app/shared/components/IndustrialForm';
type UiFoundationBestPracticeSubject = IndustrialFieldOption;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function tsxFiles(root: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) results.push(...tsxFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.tsx')) results.push(path);
  }
  return results;
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
    const form = source('src/app/shared/components/IndustrialSelectionInputs.tsx');

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


  it('führt alle nativen Selects sichtbar über den zentralen Industrial-Select-Vertrag', () => {
    for (const file of tsxFiles('src/app')) {
      const text = source(file);
      for (const match of text.matchAll(/<select\b([^>]*)>/gs)) {
        expect(match[1], `${file}: natives select braucht industrial-select`).toContain('industrial-select');
      }
    }
  });

  it('verwendet Primary nicht für reine Schließen-Aktionen und Danger für textuelle Löschaktionen', () => {
    for (const file of tsxFiles('src/app')) {
      const text = source(file);
      expect(text, `${file}: Schließen ist keine Primary-Aktion`).not.toMatch(/className=["']industrial-button[^"']*["'][^>]*>\s*Schließen/);
      expect(text, `${file}: IndustrialButton-Schließen braucht secondary`).not.toMatch(/<IndustrialButton(?![^>]*variant=)[^>]*>\s*Schließen/);
      expect(text, `${file}: textuelles Löschen braucht Danger-Styling`).not.toMatch(/className=["']industrial-secondary-button[^"']*["'][^>]*>[\s\S]{0,160}?Löschen/);
    }
  });

  it('ordnet konkurrierende Toolbar-Aktionen nach Funktion statt nach Modulhistorie', () => {
    const persons = source('src/app/features/persons/PersonToolbar.tsx');
    expect(persons).toMatch(/<IndustrialButton[^>]*open-person-create-dialog/);
    expect(persons).toMatch(/<ToolbarButton[^>]*open-person-import-wizard/);
  });
});
