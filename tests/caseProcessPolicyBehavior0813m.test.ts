import { describe, expect, it } from 'vitest';
import { canStartProcessAt, getCaseProcessCapability, requiresCaseBinding, shouldCreatePlaceholder } from '../services/caseProcessPolicy';

describe('case process policy behavior', () => {
  it('returns capabilities for known process types and allows documented entry points', () => {
    const prevention = getCaseProcessCapability('prevention');

    expect(prevention.label).toBe('Präventionsverfahren');
    expect(prevention.canCreateStructuredProcess).toBe(true);
    expect(prevention.canCreateCasePlaceholder).toBe(false);
    expect(canStartProcessAt('prevention', 'case-tree')).toBe(true);
    expect(canStartProcessAt('prevention', 'process-module')).toBe(true);
  });

  it('distinguishes placeholder-only BEM from structured process types', () => {
    expect(shouldCreatePlaceholder('bem')).toBe(true);
    expect(shouldCreatePlaceholder('prevention')).toBe(false);
    expect(requiresCaseBinding('termination_hearing')).toBe(true);
  });

  it('fails closed for unknown process types', () => {
    expect(() => getCaseProcessCapability('unknown' as never)).toThrow('Unbekannter Prozesstyp');
  });
});
