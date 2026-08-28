import type { RetentionRule } from "../../../domain/models/retention.model";

export const retentionRuleKindLabels: Record<RetentionRule["kind"], string> = {
  months_after_completion: "Monate nach Abschluss",
  months_after_completion_year_end: "Monate nach Jahresende des Abschlusses",
  term_related: "Monate / amtszeitbezogen",
  purpose_linked: "Zweckgebunden",
  permanent_anonymized: "Dauerhaft anonymisiert",
};

export function retentionRuleLabel(rule: RetentionRule): string {
  if (rule.kind === "months_after_completion") return `${rule.months} Monate nach Abschluss`;
  if (rule.kind === "months_after_completion_year_end") return `${rule.months} Monate nach Jahresende des Abschlusses`;
  if (rule.kind === "term_related") return `${rule.months} Monate / amtszeitbezogen`;
  if (rule.kind === "purpose_linked") return "Sofort nach Zweckwegfall";
  return "Dauerhaft, ausschließlich anonymisiert";
}

export function ruleMonths(rule: RetentionRule, fallback = 36): number {
  return "months" in rule ? rule.months : fallback;
}
