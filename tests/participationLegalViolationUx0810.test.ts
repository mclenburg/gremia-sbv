import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const view = readFileSync('src/app/features/participation/ParticipationView.tsx', 'utf8');
const css = readFileSync('src/app/features/participation/participationWorkbench.css', 'utf8');

describe('0.8.10 ParticipationView legal violation UX', () => {
  it('renders a dedicated legal warning for documented participation violations', () => {
    expect(view).toContain('ParticipationLegalViolationWarning');
    expect(view).toContain("record.status !== 'pflichtverstoss_dokumentiert'");
    expect(view).toContain('Beteiligungspflichtverletzung dokumentiert');
    expect(view).toContain('§ 178 Abs. 2 Satz 1 SGB IX');
    expect(view).toContain('§ 178 Abs. 2 Satz 2 SGB IX');
  });

  it('does not claim automatic invalidity of the employer measure', () => {
    expect(view).not.toMatch(/ist\s+unwirksam/i);
    expect(view).not.toMatch(/automatisch\s+unwirksam/i);
    expect(view).toContain('keine automatische Aussage');
    expect(view).toContain('mögliche Rechtsfolgen');
    expect(view).toContain('Einschaltung des Inklusionsamts');
  });

  it('styles the warning as a visible warning card without hard-coded light or dark fallback', () => {
    expect(css).toContain('.participation-legal-warning');
    expect(css).toContain('var(--industrial-danger-bg');
    expect(css).toContain('var(--industrial-text');
  });
});
