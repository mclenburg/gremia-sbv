import type { CreateDeadlineInput, DeadlineSeverity } from '../../core/models/deadline.model';
import type { TextCommandKind } from '@services/textCommandPolicy';

export interface GlobalDeadlineDraft {
  kind: Extract<TextCommandKind, 'deadline' | 'follow_up'>;
  title: string;
  dueAt: string;
  severity: DeadlineSeverity;
}

export function buildGlobalDeadlineInput(draft: GlobalDeadlineDraft): CreateDeadlineInput {
  const title = draft.title.trim();
  if (!title) throw new Error('Bitte einen Titel für die Frist erfassen.');
  if (!draft.dueAt) throw new Error('Bitte ein Fälligkeitsdatum für die Frist erfassen.');

  const dueAt = new Date(draft.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new Error('Das Fälligkeitsdatum ist ungültig.');

  return {
    processType: 'custom',
    deadlineType: 'follow_up',
    title,
    confidentialTitle: draft.kind === 'deadline' ? 'SBV-Frist' : 'SBV-Wiedervorlage',
    description: draft.kind === 'deadline'
      ? 'Fallaktenunabhängige Frist per Textkurzbefehl angelegt.'
      : 'Fallaktenunabhängige Wiedervorlage per Textkurzbefehl angelegt.',
    dueAt: dueAt.toISOString(),
    sourceEvent: draft.kind === 'deadline' ? 'text_command.deadline' : 'text_command.follow_up',
    severity: draft.severity,
    calculationMode: 'manual',
    isLegalDeadline: false,
    isUserEditable: true,
  };
}
