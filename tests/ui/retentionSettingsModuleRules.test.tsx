import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RetentionModuleRuleEditor } from '../../src/app/features/settings/RetentionModuleRuleEditor';
import { RETENTION_OPERATIONAL_SETTINGS_FIELDS } from '../../src/app/features/settings/RetentionOperationalSettingsGrid';
import { retentionPolicyDefinitionsWithRules } from '../../src/domain/retention/retentionPolicyCatalog';

describe('Retention module rule editor', () => {
  it('macht jede fachliche Standard-Aufbewahrungsfrist editierbar und barrierearm benannt', () => {
    const policies = retentionPolicyDefinitionsWithRules({
      recruiting: { kind: 'months_after_completion', months: 18 },
    });

    const markup = renderToStaticMarkup(
      <RetentionModuleRuleEditor policies={policies} onRuleChange={() => undefined} />,
    );

    for (const policy of policies) {
      expect(markup).toContain(policy.label);
      expect(markup).toContain(`aria-label="Regelart für ${policy.label}"`);
      expect(markup).toContain(`aria-label="Monate für ${policy.label}"`);
    }
    expect(markup).toContain('18');
    expect(markup).toContain('Zweckgebunden');
    expect(markup).toContain('Dauerhaft anonymisiert');
  });

  it('trennt operative Prüfschwellen von fachlichen Modulfristen', () => {
    const operationalKeys = RETENTION_OPERATIONAL_SETTINGS_FIELDS.map((field) => field.key);

    expect(operationalKeys).toEqual([
      'inactiveOpenCaseMonths',
      'orphanContactReviewDays',
      'completedDeadlineRetentionMonths',
      'minimumGroupSizeForReports',
    ]);
    expect(operationalKeys).not.toContain('closedCaseReviewMonths');
    expect(operationalKeys).not.toContain('activityJournalReviewMonths');
    expect(operationalKeys).not.toContain('participationViolationReviewMonths');
  });
});
