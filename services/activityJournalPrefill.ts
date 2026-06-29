import { ActivityJournalTitleService } from './activityJournalTitleService.js';
import type { ActivityJournalPrefill, ActivityJournalPrefillContext, CreateActivityJournalEntryInput } from '../src/app/core/models/activity-journal.model.js';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function categoryForContext(context: ActivityJournalPrefillContext): CreateActivityJournalEntryInput['category'] {
  if (context.category) return context.category;
  if (context.contextType === 'case') return 'case_work';
  if (context.contextType === 'bem_process') return 'bem_preparation';
  if (context.contextType === 'prevention_process') return 'prevention';
  if (context.contextType === 'sbv_participation' || context.contextType === 'termination_hearing' || context.contextType === 'recruiting_participation' || context.contextType === 'recruiting_interview') return 'participation';
  if (context.contextType === 'sbv_control_protocol') return 'sbv_steering';
  if (context.contextType === 'deadline') return 'documentation';
  return 'documentation';
}

function contextToLink(context: ActivityJournalPrefillContext): CreateActivityJournalEntryInput['links'] {
  const links: NonNullable<CreateActivityJournalEntryInput['links']> = [];
  if (context.contextId && context.contextType !== 'journal' && context.contextType !== 'fallfrei') {
    links.push({ targetType: context.contextType as NonNullable<CreateActivityJournalEntryInput['links']>[number]['targetType'], targetId: context.contextId });
  }
  if (context.caseId && context.contextType !== 'case') {
    links.push({ targetType: 'case', targetId: context.caseId });
  }
  return links;
}

export function buildFromContext(context: ActivityJournalPrefillContext): ActivityJournalPrefill {
  const category = categoryForContext(context);
  const titleService = new ActivityJournalTitleService();
  return {
    entry: {
      entryDate: context.entryDate ?? todayIsoDate(),
      timeMode: 'none',
      category,
      title: titleService.synthesizeTitle(context, category),
      confidentialityLevel: 'confidential',
      status: context.followUpDueAt ? 'follow_up_open' : 'final',
      createdFrom: 'context_prefill',
      followUpDueAt: context.followUpDueAt,
      links: contextToLink(context)
    },
    sourceLabel: context.title ?? context.caseNumber ?? context.contextType,
    privacyNotice: 'Vorbelegung aus bereits geöffnetem Kontext. Es wurde noch kein Journaleintrag gespeichert.',
    preferenceContextType: context.contextType
  };
}

export function buildFromDeadline(deadline: { id: string; title?: string; dueAt?: string; processId?: string; processType?: string; caseId?: string }): ActivityJournalPrefill {
  return buildFromContext({
    contextType: 'deadline',
    contextId: deadline.id,
    caseId: deadline.caseId,
    title: deadline.title ?? 'Frist',
    category: 'documentation'
  });
}

export function buildFromClosedJournalDeadline(deadline: { id: string; title?: string; dueAt?: string; processId?: string; processType?: string; caseId?: string }): ActivityJournalPrefill {
  const prefill = buildFromDeadline(deadline);
  return {
    ...prefill,
    entry: {
      ...prefill.entry,
      title: 'Journal-Wiedervorlage: Ergebnis dokumentiert',
      resultNote: deadline.title ? `Ergebnis zur Wiedervorlage „${deadline.title}“ dokumentieren.` : undefined
    }
  };
}
