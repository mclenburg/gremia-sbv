import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.8.12 missing target rendering', () => {
  it('marks missing targets without crashing the note view', () => {
    const service = readFileSync('services/caseService.ts', 'utf8');
    const component = readFileSync('src/app/features/cases/CaseNoteEntityLinks.tsx', 'utf8');
    expect(service).toContain('is_missing_target');
    expect(component).toContain('Ziel nicht mehr vorhanden');
    expect(component).toContain('disabled={disabled}');
  });
});
