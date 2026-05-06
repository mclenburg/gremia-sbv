import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const responsiveSpec = readFileSync('e2e/responsive-layout.spec.ts', 'utf8');
const accessibilitySpec = readFileSync('e2e/accessibility.spec.ts', 'utf8');

describe('E2E responsive and accessibility readiness', () => {
  it('covers multiple desktop viewports and overflow checks', () => {
    for (const token of ['1280', '1366', '1440', '1920', '2560']) {
      expect(responsiveSpec).toContain(token);
    }
    expect(responsiveSpec).toContain('hasHorizontalOverflow');
    expect(responsiveSpec).toContain('expectInViewport');
    expect(responsiveSpec).toContain('main-nav-cases');
    expect(responsiveSpec).toContain('main-nav-compliance');
  });

  it('covers keyboard and role-based accessibility flows', () => {
    expect(accessibilitySpec).toContain('getByRole');
    expect(accessibilitySpec).toContain('keyboard.press');
    expect(accessibilitySpec).toContain('inline-help-dialog');
    expect(accessibilitySpec).toContain('note-entity-link');
  });
});
