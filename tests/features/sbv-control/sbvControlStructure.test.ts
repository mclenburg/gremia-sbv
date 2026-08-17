import { describe, expect, it } from 'vitest';
import { getParticipationDocumentRequirements, getParticipationEscalationAdvice } from '../../../src/app/features/participation/participationPolicy';
import { modules } from '../../../src/app/core/navigation/modules';
import { buildSbvControlSections } from '../../../src/app/features/sbv-control/sbvControlSections';
import type { ParticipationRecord } from '../../../src/domain/models/participation.model';

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

describe('SBV-Dokumentationsstruktur', () => {
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

  it('integriert SBV-Dokumentation als fachliches Kernarbeitsmodul mit vollständiger Bereichsnavigation', () => {
    expect(modules.find((module) => module.id === 'sbv_control')).toMatchObject({
      title: 'SBV-Dokumentation',
      shortTitle: 'Dokumentation',
      group: 'core',
    });

    const sections = buildSbvControlSections({
      resources: 1,
      meetings: 2,
      assemblies: 1,
      assemblyWarning: false,
      complaints: 3,
      openProtocolFollowUps: 4,
      criticalParticipation: 1,
      obligations: 5,
      agreements: 2,
      month: 'August 2026',
    });

    expect(sections.map((section) => section.id)).toEqual([
      'resources',
      'meetings',
      'assembly',
      'complaints',
      'protocols',
      'participation',
      'obligations',
      'inclusion',
      'reports',
    ]);
    expect(sections.find((section) => section.id === 'meetings')?.summary).toBe('2 Sitzungen');
    expect(sections.find((section) => section.id === 'complaints')?.summary).toBe('3 Vorgänge');
  });
});
