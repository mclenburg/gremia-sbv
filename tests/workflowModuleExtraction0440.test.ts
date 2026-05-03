import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = () => readFileSync('src/app/App.tsx', 'utf8');
const workflow = () => readFileSync('src/app/workflowViews.tsx', 'utf8');

describe('workflow module extraction 0.4.40', () => {
  it('imports KnowledgeView and PreventionView from feature modules', () => {
    const source = app();
    expect(source).toContain("import { KnowledgeView } from './features/knowledge/KnowledgeView';");
    expect(source).toContain("import { PreventionView } from './features/prevention/PreventionView';");
    expect(source).not.toContain("  KnowledgeView,\n  LoginGate,");
    expect(source).not.toContain("  PreventionView,\n  ReportsView,");
  });

  it('removes the extracted views from workflowViews', () => {
    const source = workflow();
    expect(source).not.toContain('export function KnowledgeView');
    expect(source).not.toContain('export function PreventionView');
    expect(source).not.toContain('SBV_ADVISOR_KNOWLEDGE_ENTRIES');
    expect(source).not.toContain('function ProcessOverviewPage');
  });

  it('keeps shared prevention labels in a dedicated module', () => {
    const shared = readFileSync('src/app/features/prevention/preventionShared.ts', 'utf8');
    expect(shared).toContain('export function statusLabel');
    expect(shared).toContain('export const preventionStatusOrder');
  });
});
