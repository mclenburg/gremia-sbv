import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(path, 'utf8');

describe('Beteiligungsverstoß Release-Härtung 0.9.4-d4', () => {
  it('hält den Entwurf als echtes Formular mit Feldfehlern und A11y-Beschreibung', () => {
    const view = source('src/app/features/participation-violations/SbvParticipationViolationsView.tsx');

    expect(view).toContain('<form onSubmit={handleSubmit} noValidate');
    expect(view).toContain('aria-label="Beteiligungsverstoß bewusst speichern"');
    expect(view).toContain('error={state.fieldErrors.sourceContextId}');
    expect(view).toContain('error={state.fieldErrors.caseId}');
    expect(view).toContain('error={state.fieldErrors.subject}');
    expect(view).toContain('type="submit"');
    expect(view).toContain('loading={state.busy}');
  });

  it('kündigt Erfolge und Validierungsfehler über die zentrale Live-Region an', () => {
    const hook = source('src/app/features/participation-violations/hooks/useSbvParticipationViolations.ts');

    expect(hook).toContain('useAnnouncer');
    expect(hook).toContain("announce(validationMessage, 'assertive')");
    expect(hook).toContain("announce(successMessage)");
    expect(hook).toContain('validateViolationDraft(form)');
    expect(hook).toContain('buildViolationFieldErrors(validationIssues)');
  });

  it('macht den Beteiligungsverstoß-Flow als E2E-Release-Gate sichtbar', () => {
    const e2e = source('e2e/participation-violations-flow.spec.ts');

    expect(e2e).toContain('Beteiligungsverstöße');
    expect(e2e).toContain('Verstoß bewusst speichern');
    expect(e2e).toContain('industrial-live-region');
    expect(e2e).toContain('case_measure_participation');
  });
});
