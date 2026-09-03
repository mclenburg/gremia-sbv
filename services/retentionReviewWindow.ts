import type { RetentionRule, RetentionSettings } from '../src/domain/models/retention.model.js';
import { reviewWindowLabel } from './retentionSettings.js';

function monthsAgo(now: Date, months: number): Date {
  const copy = new Date(now.getTime());
  copy.setMonth(copy.getMonth() - months);
  return copy;
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function reviewCutoffForRule(now: Date, rule: RetentionRule, fallbackDays: number): Date {
  return 'months' in rule ? monthsAgo(now, rule.months) : daysAgo(now, fallbackDays);
}

export function contactReviewWindowLabel(settings: RetentionSettings): string {
  if (!('months' in settings.moduleRules.protected_person) && settings.orphanContactReviewDays === 0) {
    return 'sofort nach Zweckwegfall';
  }
  return 'months' in settings.moduleRules.protected_person
    ? reviewWindowLabel(settings.moduleRules.protected_person, settings.orphanContactReviewDays)
    : `${settings.orphanContactReviewDays} Tagen nach Zweckwegfall`;
}

export function journalReviewCutoff(now: Date, settings: RetentionSettings): Date {
  return 'months' in settings.moduleRules.activity_journal
    ? monthsAgo(now, settings.moduleRules.activity_journal.months)
    : monthsAgo(now, settings.activityJournalReviewMonths);
}

export function journalReviewWindowLabel(settings: RetentionSettings): string {
  return 'months' in settings.moduleRules.activity_journal
    ? reviewWindowLabel(settings.moduleRules.activity_journal, settings.activityJournalReviewMonths)
    : `${settings.activityJournalReviewMonths} Monaten`;
}
