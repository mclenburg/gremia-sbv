import { describe, expect, it } from 'vitest';
import { DEFAULT_LEGAL_NORMS, buildNormInsertText, knowledgeExportPreview, normMatchesQuery, normalizeNormQuery } from '../services/knowledgePolicy';

describe('knowledgePolicy', () => {
  it('liefert einen belastbaren Startbestand relevanter SBV-Normen', () => {
    expect(DEFAULT_LEGAL_NORMS.length).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_LEGAL_NORMS.some((norm) => norm.id === 'sgb-ix-167-1')).toBe(true);
    expect(DEFAULT_LEGAL_NORMS.some((norm) => norm.id === 'sgb-ix-178-2')).toBe(true);
  });

  it('normalisiert Paragraphensuchen robust', () => {
    expect(normalizeNormQuery('§§ 178   Abs. 2').trim()).toBe('178 abs. 2');
  });

  it('findet Normen über Paragraph, Titel, Kurztext und Tags', () => {
    const prevention = DEFAULT_LEGAL_NORMS.find((norm) => norm.id === 'sgb-ix-167-1');
    expect(prevention).toBeDefined();
    expect(normMatchesQuery(prevention!, '167 Prävention')).toBe(true);
    expect(normMatchesQuery(prevention!, 'Inklusionsamt')).toBe(true);
    expect(normMatchesQuery(prevention!, 'Kündigungsschutzklage')).toBe(false);
  });

  it('erstellt lesbare Einfügetexte für das §§ Overlay', () => {
    const norm = DEFAULT_LEGAL_NORMS.find((item) => item.id === 'sgb-ix-178-2')!;
    expect(buildNormInsertText(norm)).toContain('§ 178 Abs. 2 SGB IX');
    expect(buildNormInsertText(norm)).toContain('Unterrichtung und Anhörung');
  });

  it('markiert Wissensexporte standardmäßig als fallbezugfrei', () => {
    const preview = knowledgeExportPreview(12);
    expect(preview.includesCaseReferences).toBe(false);
    expect(preview.normCount).toBe(12);
  });
});
