import { describe, expect, it } from 'vitest';
import { mergeContextValues, missingPlaceholderWarning, resolveContextualTemplateAction } from '../services/templateContextPolicy.js';

describe('templateContextPolicy', () => {
  it('maps prevention employer steps to the prevention request template', () => {
    const action = resolveContextualTemplateAction({ sourceType: 'prevention', key: 'arbeitgeber_anschreiben', title: 'Arbeitgeber anschreiben' });
    expect(action?.templateKey).toBe('praeventionsverfahren-einfordern');
  });

  it('maps prevention reaction steps to the reminder template', () => {
    const action = resolveContextualTemplateAction({ sourceType: 'prevention', key: 'reaktion_nachhalten', title: 'Arbeitgeberreaktion nachhalten' });
    expect(action?.templateKey).toBe('freundliche-fristerinnerung');
  });

  it('provides a general case action for case context', () => {
    const action = resolveContextualTemplateAction({ sourceType: 'case', title: 'Fallübersicht' });
    expect(action?.templateKey).toBe('sbv-beteiligung-unterlagen-nachfordern');
  });

  it('merges only useful context values', () => {
    expect(mergeContextValues({ a: 'eins', b: '' }, { b: 'zwei', c: undefined })).toEqual({ a: 'eins', b: 'zwei' });
  });

  it('formats unresolved placeholder warnings in German', () => {
    expect(missingPlaceholderWarning(['frist.datum'])).toContain('frist.datum');
    expect(missingPlaceholderWarning([])).toBe('');
  });
});
