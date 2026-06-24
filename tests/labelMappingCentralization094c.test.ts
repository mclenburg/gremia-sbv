import { describe, expect, it } from 'vitest';
import { ACTIVITY_JOURNAL_CATEGORIES } from '../src/app/core/models/activity-journal.model';
import {
  activityJournalCategoryLabels,
  activityJournalTimeModeLabels,
} from '../src/app/core/labels/activityJournalLabels';
import {
  deadlineProcessTypeLabels,
  deadlineSeverityLabels,
  deadlineTypeLabels,
} from '../src/app/core/labels/deadlineLabels';
import {
  DEADLINE_PROCESS_TYPES,
  DEADLINE_SEVERITIES,
  DEADLINE_TYPES,
} from '../src/app/core/models/deadline.model';
import {
  PARTICIPATION_VIOLATION_STAGES,
  PARTICIPATION_VIOLATION_STATUS_TRANSITIONS,
  PARTICIPATION_VIOLATION_TYPES,
} from '../src/app/core/models/sbv-participation-violation.model';
import {
  sbvParticipationViolationDocumentStageLabels,
  sbvParticipationViolationStageLabels,
  sbvParticipationViolationStageOptions,
  sbvParticipationViolationStatusLabels,
  sbvParticipationViolationTypeLabels,
  sbvParticipationViolationTypeOptions,
} from '../src/app/core/labels/sbvParticipationViolationLabels';
import { categoryLabel } from '../src/app/features/activity-journal/activityJournalLogic';
import {
  stageLabels,
  stageOptions,
  statusLabels,
  violationTypeLabels,
  violationTypeOptions,
} from '../src/app/features/participation-violations/sbvParticipationViolationViewLogic';
import { SbvParticipationViolationTemplateService } from '../services/sbvParticipationViolationTemplateService';

describe('zentrale Label- und Mapping-Verträge 0.9.4-c-r5', () => {
  it('liefert vollständige Activity-Journal-Labels und UI-Logik nutzt die zentrale Quelle', () => {
    expect(Object.keys(activityJournalCategoryLabels).sort()).toEqual([...ACTIVITY_JOURNAL_CATEGORIES].sort());
    expect(categoryLabel('sbv_self_organization')).toBe(activityJournalCategoryLabels.sbv_self_organization);
    expect(activityJournalTimeModeLabels).toMatchObject({
      none: 'keine Zeitangabe',
      duration: 'Dauer',
      range: 'Zeitraum',
      timer: 'Timer',
    });
  });

  it('liefert vollständige Deadline-Labels für alle Prozess-, Typ- und Schweregrad-Branches', () => {
    expect(Object.keys(deadlineProcessTypeLabels).sort()).toEqual([...DEADLINE_PROCESS_TYPES].sort());
    expect(Object.keys(deadlineTypeLabels).sort()).toEqual([...DEADLINE_TYPES].sort());
    expect(Object.keys(deadlineSeverityLabels).sort()).toEqual([...DEADLINE_SEVERITIES].sort());
    expect(deadlineProcessTypeLabels.activity_journal).toBe('Tätigkeitsjournal');
    expect(deadlineProcessTypeLabels.sbv_participation_violation).toBe('Beteiligungsverstoß');
  });

  it('nutzt für Beteiligungsverstöße dieselbe zentrale Labelquelle in View-Logic und Optionen', () => {
    expect(stageLabels).toBe(sbvParticipationViolationStageLabels);
    expect(statusLabels).toBe(sbvParticipationViolationStatusLabels);
    expect(violationTypeLabels).toBe(sbvParticipationViolationTypeLabels);
    expect(stageOptions).toBe(sbvParticipationViolationStageOptions);
    expect(violationTypeOptions).toBe(sbvParticipationViolationTypeOptions);

    expect(Object.keys(sbvParticipationViolationStageLabels).sort()).toEqual([...PARTICIPATION_VIOLATION_STAGES].sort());
    expect(Object.keys(sbvParticipationViolationTypeLabels).sort()).toEqual([...PARTICIPATION_VIOLATION_TYPES].sort());
    expect(Object.keys(sbvParticipationViolationStatusLabels).sort()).toEqual(Object.keys(PARTICIPATION_VIOLATION_STATUS_TRANSITIONS).sort());
  });

  it('trennt UI-Labels und dokumentfachliche Überschriften bewusst ohne doppelte lokale Maps', () => {
    const service = new SbvParticipationViolationTemplateService();

    expect(sbvParticipationViolationStageLabels.suspension_request).toBe('Aussetzungsverlangen');
    expect(sbvParticipationViolationDocumentStageLabels.suspension_request).toContain('§ 178 Abs. 2 Satz 2 SGB IX');

    const text = service.buildPlainText({
      stage: 'suspension_request',
      subject: 'SBV-Beteiligung nachholen',
      sourceReference: 'Fall SBV-2026-004',
      measureDescription: 'Entscheidung wurde ohne vollständige SBV-Beteiligung vorbereitet.',
      wrongBehavior: 'Die SBV wurde vor der Entscheidung nicht ordnungsgemäß angehört.',
      requiredBehavior: 'Die Durchführung ist auszusetzen und die Beteiligung vollständig nachzuholen.',
      followUpDueAt: '2026-07-01T00:00:00.000Z',
      includeOwiHint: false,
      includeLegalReviewHint: true,
      privacyMode: 'case_reference',
    });

    expect(text).toContain(sbvParticipationViolationDocumentStageLabels.suspension_request);
    expect(text).not.toContain('OWi-Hinweis / Vorbereitung Anzeige');
  });
});
