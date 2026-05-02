import { describe, expect, it } from 'vitest';
import { canStartProcessAt, getCaseProcessCapability, requiresCaseBinding, shouldCreatePlaceholder } from '../services/caseProcessPolicy';

describe('caseProcessPolicy', () => {
  it('bindet alle Fachmaßnahmen zwingend an eine Fallakte', () => {
    expect(requiresCaseBinding('prevention')).toBe(true);
    expect(requiresCaseBinding('bem')).toBe(true);
    expect(requiresCaseBinding('termination_hearing')).toBe(true);
    expect(requiresCaseBinding('equalization')).toBe(true);
  });

  it('erlaubt Startpunkte aus Fallbaum, Fallübersicht und Fachmodul', () => {
    expect(canStartProcessAt('prevention', 'case-tree')).toBe(true);
    expect(canStartProcessAt('prevention', 'case-overview')).toBe(true);
    expect(canStartProcessAt('prevention', 'process-module')).toBe(true);
  });

  it('kennzeichnet nur vorhandene Fachmodule als strukturiert', () => {
    expect(getCaseProcessCapability('prevention').canCreateStructuredProcess).toBe(true);
    expect(shouldCreatePlaceholder('bem')).toBe(true);
    expect(shouldCreatePlaceholder('termination_hearing')).toBe(true);
  });
});
