import type { ActivityJournalCategory, ActivityJournalEntryRecord } from '../../core/models/activity-journal.model';
import { activityJournalCategoryLabels } from '../../core/labels/activityJournalLabels';

export function formatDuration(minutes?: number): string {
  if (minutes === undefined) return 'ohne Zeit';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${rest} min`;
}

export function categoryLabel(category: ActivityJournalCategory): string {
  return activityJournalCategoryLabels[category] ?? category;
}

export function entryReferenceLabel(entry: ActivityJournalEntryRecord): string {
  const links = entry.links ?? [];
  if (!links.length) return 'fallfrei';
  if (links.some((link) => link.targetType === 'case')) return 'fallbezogen';
  if (links.some((link) => link.targetType === 'sbv_control_protocol')) return 'SBV-Steuerung';
  return links.map((link) => link.targetType).join(', ');
}
