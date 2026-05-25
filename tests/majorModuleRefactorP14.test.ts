import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const lineCount = (path: string) => read(path).split(/\r?\n/).length;

describe('P14 major module refactor', () => {
  it('keeps the inline command overlay host as a thin orchestration component', () => {
    const host = 'src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx';
    expect(lineCount(host)).toBeLessThan(180);
    const source = read(host);
    expect(source).toContain('<InlineCaseLinkOverlay props={props} />');
    expect(source).toContain('<InlineDeadlineOverlay props={props} />');
    expect(source).not.toContain('industrial-modal-backdrop" role="presentation"');
  });

  it('splits inline command dialogs into dedicated overlay components', () => {
    const overlayDir = 'src/app/features/cases/inlineCommands/overlays';
    const required = [
      'InlineCaseLinkOverlay.tsx',
      'InlineLegalNormOverlay.tsx',
      'InlineRiskOverlay.tsx',
      'InlineOpenTaskOverlay.tsx',
      'InlineConfidentialityOverlay.tsx',
      'InlineAnonymizationOverlay.tsx',
      'InlineContactOverlay.tsx',
      'InlineBemOverlay.tsx',
      'InlinePreventionOverlay.tsx',
      'InlineEqualizationOverlay.tsx',
      'InlineTerminationOverlay.tsx',
      'InlineParticipationOverlay.tsx',
      'InlineWorkplaceAccommodationOverlay.tsx',
      'InlineTemplateOverlay.tsx',
      'InlineDeadlineOverlay.tsx',
    ];
    for (const file of required) {
      const path = `${overlayDir}/${file}`;
      expect(existsSync(join(root, path)), `${path} fehlt`).toBe(true);
      expect(read(path)).toContain('InlineCommandOverlaysProps');
    }
  });

  it('keeps the knowledge view thin and moves data, search and panels out of the view', () => {
    expect(lineCount('src/app/features/knowledge/KnowledgeView.tsx')).toBeLessThan(240);
    expect(existsSync(join(root, 'src/app/features/knowledge/knowledgeAdvisorData.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/app/features/knowledge/knowledgeSearch.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/app/features/knowledge/KnowledgePanels.tsx'))).toBe(true);

    const view = read('src/app/features/knowledge/KnowledgeView.tsx');
    expect(view).toContain('<KnowledgeSearchPanel');
    expect(view).toContain('<KnowledgeRegisterPanel');
    expect(view).toContain('<KnowledgeDetailPanel');
    expect(view).not.toContain('const SBV_ADVISOR_KNOWLEDGE_ENTRIES = [');
  });

  it('moves template catalog rules and help dialog out of the templates view', () => {
    expect(existsSync(join(root, 'src/app/features/templates/templateCatalogLogic.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/app/features/templates/TemplateHelpModal.tsx'))).toBe(true);
    expect(lineCount('src/app/features/templates/TemplatesView.tsx')).toBeLessThan(420);

    const view = read('src/app/features/templates/TemplatesView.tsx');
    expect(view).toContain('<TemplateHelpModal');
    expect(view).not.toContain('function groupTemplates');
    expect(view).not.toContain('Platzhalter in Vorlagen</h2>');
  });
});
