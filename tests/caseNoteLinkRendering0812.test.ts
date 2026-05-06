import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.8.12 case note link rendering', () => {
  it('renders note entity links as accessible buttons', () => {
    const component = readFileSync('src/app/features/cases/CaseNoteEntityLinks.tsx', 'utf8');
    const render = readFileSync('src/app/features/cases/CasesViewRender.tsx', 'utf8');
    expect(component).toContain('aria-label={link.accessibleLabel}');
    expect(component).toContain('data-e2e="note-entity-link"');
    expect(component).toContain('onSelect(selection)');
    expect(render).toContain('<CaseNoteEntityLinks');
  });
});
