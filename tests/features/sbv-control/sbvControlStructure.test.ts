import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getParticipationDocumentRequirements, getParticipationEscalationAdvice } from '../../../src/app/features/participation/participationPolicy';
import type { ParticipationRecord } from '../../../src/app/core/models/participation.model';

const baseRecord: ParticipationRecord = {
  id: 'p-1',
  caseId: 'c-1',
  title: 'Beteiligung Test',
  measureType: 'kuendigung',
  status: 'anhoerung_laeuft',
  riskLevel: 'kritisch',
  personStatus: 'schwerbehindert',
  decisionStage: 'entscheidung_getroffen',
  informationComplete: true,
  hearingBeforeDecision: false,
  decisionNotified: false,
  createdAt: '2026-05-23T08:00:00.000Z',
  updatedAt: '2026-05-23T08:00:00.000Z'
};

describe('SBV-Steuerungsstruktur 0.9.2', () => {
  it('bewertet kritische Beteiligung nicht als normale Dokumentation', () => {
    const advice = getParticipationEscalationAdvice(baseRecord, new Date('2026-05-23T09:00:00.000Z'));

    expect(advice.level).toBe('critical');
    expect(advice.nextStep).toMatch(/Pflichtverstoß|Nachholung|Aussetzung/);
  });

  it('liefert maßnahmentypspezifische Unterlagenmatrix für Kündigung', () => {
    const requirements = getParticipationDocumentRequirements('kuendigung').map((item) => item.label).join('\n');

    expect(requirements).toContain('Kündigungsgrund');
    expect(requirements).toContain('BEM-Stand');
    expect(requirements).toContain('Integrationsamt');
  });

  it('integriert SBV-Dokumentation als App-konformes Modul', () => {
    const nav = readFileSync('src/app/core/navigation/modules.ts', 'utf8');
    const app = readFileSync('src/app/App.tsx', 'utf8');
    const lazyViews = readFileSync('src/app/core/loading/lazyFeatureViews.tsx', 'utf8');
    const lazyHost = readFileSync('src/app/core/loading/LazyFeatureHost.tsx', 'utf8');
    const view = readFileSync('src/app/features/sbv-control/SbvControlView.tsx', 'utf8');
    expect(nav).toContain("id: 'sbv_control'");
    expect(nav).toContain("title: 'SBV-Dokumentation'");
    expect(nav).toContain("shortTitle: 'Dokumentation'");
    expect([app, lazyViews, lazyHost].join('\n')).toMatch(/LazyFeatureHost[\s\S]*sbv_control:[\s\S]*SbvControlView[\s\S]*view === \"sbv_control\"/);
    expect(view).toContain('activeSection');
    const sections = readFileSync('src/app/features/sbv-control/sbvControlSections.ts', 'utf8');
    expect(sections).toContain("id: 'protocols'");
    expect(view).toContain('ProtocolSection');
    expect(view).toContain('onNavigate');
    const protocolSection = readFileSync('src/app/features/sbv-control/components/ProtocolSection.tsx', 'utf8');
    expect(protocolSection).toContain('ActivityJournalContextButton');
    expect(protocolSection).toContain("contextType: 'sbv_control_protocol'");
    expect(view).toContain('WorkbenchPage');
    expect(view).toContain('WorkbenchWorkspace');
    expect(view).not.toContain('sbv-control-shell');
  });
});
