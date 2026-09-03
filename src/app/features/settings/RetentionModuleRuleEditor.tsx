import type {
  RetentionModuleType,
  RetentionPolicyDefinition,
  RetentionRule,
} from "../../../domain/models/retention.model";
import type { IndustrialFieldOption } from "../../shared/components/IndustrialFormCore";
import { SelectInput } from "../../shared/components/IndustrialSelectionInputs";
import { TextInput } from "../../shared/components/IndustrialTextInputs";
import { retentionRuleKindLabels, retentionRuleLabel, ruleMonths } from "./retentionSettingsPresentation";

type MonthRetentionRule = Extract<RetentionRule, { months: number }>;

const editableKinds: RetentionRule["kind"][] = [
  "months_after_completion",
  "months_after_completion_year_end",
  "term_related",
  "purpose_linked",
  "permanent_anonymized",
];

const editableKindOptions: IndustrialFieldOption[] = editableKinds.map((kind) => ({
  value: kind,
  label: retentionRuleKindLabels[kind],
}));

function hasMonthValue(rule: RetentionRule): rule is MonthRetentionRule {
  return "months" in rule;
}

function changedRuleKind(current: RetentionRule, kind: RetentionRule["kind"]): RetentionRule {
  if (kind === "purpose_linked" || kind === "permanent_anonymized") return { kind };
  if (kind === "months_after_completion") return { kind, months: ruleMonths(current) };
  if (kind === "months_after_completion_year_end") return { kind, months: ruleMonths(current) };
  return { kind: "term_related", months: ruleMonths(current) };
}

function changedRuleMonths(current: RetentionRule, value: string): RetentionRule {
  if (!hasMonthValue(current)) return current;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return current;
  return { ...current, months: Math.min(600, Math.max(1, Math.trunc(parsed))) };
}

export function RetentionModuleRuleEditor({
  policies,
  onRuleChange,
}: {
  policies: RetentionPolicyDefinition[];
  onRuleChange: (module: RetentionModuleType, rule: RetentionRule) => void;
}) {
  return (
    <div className="industrial-table-shell mt-3">
      <table className="industrial-table">
        <thead>
          <tr>
            <th>Modul</th>
            <th>Regelart</th>
            <th>Monate</th>
            <th>Aktive Prüffrist</th>
            <th>Rechtsrahmen</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.module}>
              <td>
                <strong>{policy.label}</strong>
                <p className="industrial-settings-note mt-1">{policy.explanation}</p>
              </td>
              <td>
                <SelectInput
                  aria-label={`Regelart für ${policy.label}`}
                  label={`Regelart für ${policy.label}`}
                  options={editableKindOptions}
                  value={policy.rule.kind}
                  onValueChange={(value) => onRuleChange(policy.module, changedRuleKind(policy.rule, value as RetentionRule["kind"]))}
                />
              </td>
              <td>
                <TextInput
                  aria-label={`Monate für ${policy.label}`}
                  label={`Monate für ${policy.label}`}
                  type="number"
                  min={1}
                  max={600}
                  disabled={!hasMonthValue(policy.rule)}
                  value={hasMonthValue(policy.rule) ? String(policy.rule.months) : ""}
                  helpText={hasMonthValue(policy.rule) ? undefined : "Für diese Regelart wird keine Monatsfrist eingetragen."}
                  onValueChange={(value) => onRuleChange(policy.module, changedRuleMonths(policy.rule, value))}
                />
              </td>
              <td>{retentionRuleLabel(policy.rule)}</td>
              <td>{policy.legalBasis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
