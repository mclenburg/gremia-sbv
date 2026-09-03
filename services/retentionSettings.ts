import type { RetentionModuleRuleOverrides, RetentionSettings } from '../src/domain/models/retention.model.js';
import { defaultRetentionModuleRules, retentionPolicyDefinitionsWithRules } from './retentionPolicyCatalog.js';

export type RetentionSettingsInput = Partial<Omit<RetentionSettings, 'moduleRules'>> & {
  moduleRules?: RetentionModuleRuleOverrides;
};

export const DEFAULT_RETENTION_SETTINGS: RetentionSettings = {
  closedCaseReviewMonths: 36,
  inactiveOpenCaseMonths: 6,
  orphanContactReviewDays: 0,
  completedDeadlineRetentionMonths: 36,
  activityJournalReviewMonths: 36,
  participationViolationReviewMonths: 48,
  minimumGroupSizeForReports: 3,
  moduleRules: defaultRetentionModuleRules(),
};

function normalizeNumber(value: unknown, fallback: number, minimum = 1, maximum = 600): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(parsed)));
}

function normalizedNumericSettings(input?: RetentionSettingsInput): Omit<RetentionSettings, 'moduleRules'> {
  const merged = { ...DEFAULT_RETENTION_SETTINGS, ...(input ?? {}) };
  return {
    closedCaseReviewMonths: normalizeNumber(merged.closedCaseReviewMonths, DEFAULT_RETENTION_SETTINGS.closedCaseReviewMonths),
    inactiveOpenCaseMonths: normalizeNumber(merged.inactiveOpenCaseMonths, DEFAULT_RETENTION_SETTINGS.inactiveOpenCaseMonths),
    orphanContactReviewDays: normalizeNumber(merged.orphanContactReviewDays, DEFAULT_RETENTION_SETTINGS.orphanContactReviewDays, 0, 3650),
    completedDeadlineRetentionMonths: normalizeNumber(merged.completedDeadlineRetentionMonths, DEFAULT_RETENTION_SETTINGS.completedDeadlineRetentionMonths),
    activityJournalReviewMonths: normalizeNumber(merged.activityJournalReviewMonths, DEFAULT_RETENTION_SETTINGS.activityJournalReviewMonths),
    participationViolationReviewMonths: normalizeNumber(merged.participationViolationReviewMonths, DEFAULT_RETENTION_SETTINGS.participationViolationReviewMonths),
    minimumGroupSizeForReports: normalizeNumber(merged.minimumGroupSizeForReports, DEFAULT_RETENTION_SETTINGS.minimumGroupSizeForReports, 2, 1000),
  };
}

export function normalizeRetentionSettings(input?: RetentionSettingsInput): RetentionSettings {
  const numericSettings = normalizedNumericSettings(input);
  const merged = { ...DEFAULT_RETENTION_SETTINGS, ...numericSettings, ...(input ?? {}) };
  const moduleRules = retentionPolicyDefinitionsWithRules(merged.moduleRules)
    .reduce((rules, policy) => {
      rules[policy.module] = policy.rule;
      return rules;
    }, defaultRetentionModuleRules());
  if (!input?.moduleRules?.case_file && input?.closedCaseReviewMonths !== undefined) {
    moduleRules.case_file = { kind: 'months_after_completion', months: numericSettings.closedCaseReviewMonths };
  }
  if (!input?.moduleRules?.sbv_participation && input?.participationViolationReviewMonths !== undefined) {
    moduleRules.sbv_participation = { kind: 'term_related', months: numericSettings.participationViolationReviewMonths };
  }
  const normalized: RetentionSettings = { ...numericSettings, moduleRules };
  if (moduleRules.case_file.kind === 'months_after_completion') {
    normalized.closedCaseReviewMonths = moduleRules.case_file.months;
  }
  if ('months' in moduleRules.sbv_participation) {
    normalized.participationViolationReviewMonths = moduleRules.sbv_participation.months;
  }
  return normalized;
}

export function reviewWindowLabel(
  rule: RetentionSettings['moduleRules'][keyof RetentionSettings['moduleRules']],
  fallbackMonths: number,
): string {
  if (rule.kind === 'months_after_completion') return `${rule.months} Monaten nach Abschluss`;
  if (rule.kind === 'months_after_completion_year_end') return `${rule.months} Monaten nach Jahresende des Abschlusses`;
  if (rule.kind === 'term_related') return `${rule.months} Monaten amtszeitbezogener Aufbewahrung`;
  return `${fallbackMonths} Monaten`;
}
