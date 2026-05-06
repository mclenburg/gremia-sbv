import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shellNav = readFileSync('src/app/shell/ShellNav.tsx', 'utf8');
const helpModal = readFileSync('src/app/shared/textCommands/TextCommandHelpModal.tsx', 'utf8');
const noteLinks = readFileSync('src/app/features/cases/CaseNoteEntityLinks.tsx', 'utf8');
const workplace = readFileSync('src/app/features/workplace-accommodation/WorkplaceAccommodationView.tsx', 'utf8');
const participation = readFileSync('src/app/features/participation/ParticipationView.tsx', 'utf8');

describe('RC accessibility readiness', () => {
  it('keeps primary navigation and inline help accessible by role and stable E2E anchor', () => {
    expect(shellNav).toContain('aria-label="Hauptnavigation"');
    expect(shellNav).toContain('data-e2e="main-nav"');
    expect(shellNav).toContain('main-nav-');
    expect(shellNav).toContain("'cases'");
    expect(shellNav).toContain("'compliance'");
    expect(helpModal).toContain('role="dialog"');
    expect(helpModal).toContain('aria-modal="true"');
    expect(helpModal).toContain('data-e2e="inline-help-dialog"');
    expect(helpModal).toContain('aria-labelledby="text-command-help-title"');
  });

  it('keeps living case-note links screen-reader friendly without exposing UUID labels', () => {
    expect(noteLinks).toContain('data-e2e="note-entity-link"');
    expect(noteLinks).toContain('aria-label={link.accessibleLabel}');
    expect(noteLinks).toContain('Ziel nicht mehr vorhanden');
    expect(noteLinks).not.toContain('aria-label={link.id}');
  });

  it('keeps feature views on deliberate announcer usage instead of render spam', () => {
    expect(workplace).toContain('useAnnouncer');
    expect(participation).toContain('§ 178 Abs. 2 Satz 1 SGB IX');
    expect(participation).toContain('§ 178 Abs. 2 Satz 2 SGB IX');
  });
});
