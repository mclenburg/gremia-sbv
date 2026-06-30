export const INSTRUCTIONAL_TEXT_TRIGGERS = [
  'bewusst',
  'nur',
  'keine',
  'bitte',
  'dokumentiere',
  'erfasse',
  'diagnosen',
  'automatisch',
  'nicht automatisch',
  'keine diagnosen',
  'keine gesprächsinhalte',
  'keine eignungsbewertungen',
] as const;

export const VISIBLE_DESCRIPTION_MAX_CHARS = 120;

export const VISIBLE_TEXT_POLICY_EXEMPT_CONTEXTS = [
  'validation_error',
  'delete_warning',
  'restore_warning',
  'backup_warning',
  'escalation_warning',
  'empty_state',
] as const;

export type VisibleTextPolicyExemptContext = typeof VISIBLE_TEXT_POLICY_EXEMPT_CONTEXTS[number];

export type TextPolicyDecision = {
  shouldReview: boolean;
  reasons: string[];
};

function normalizeForPolicy(text: string): string {
  return text.toLocaleLowerCase('de-DE').replace(/\s+/g, ' ').trim();
}

function uniqueReasons(reasons: string[]): string[] {
  return Array.from(new Set(reasons));
}

export function textPolicyDecision(text: string): TextPolicyDecision {
  const normalized = normalizeForPolicy(text);
  const reasons: string[] = [];

  if (normalized.length > VISIBLE_DESCRIPTION_MAX_CHARS) {
    reasons.push('length');
  }

  for (const trigger of INSTRUCTIONAL_TEXT_TRIGGERS) {
    const normalizedTrigger = normalizeForPolicy(trigger);
    if (normalized.includes(normalizedTrigger)) {
      reasons.push(`trigger:${trigger}`);
    }
  }

  const unique = uniqueReasons(reasons);
  return {
    shouldReview: unique.length > 0,
    reasons: unique,
  };
}

export function requiresHelpRegistryDecision(text: string): boolean {
  return textPolicyDecision(text).shouldReview;
}

export function isVisibleTextPolicyExemptContext(context: string): context is VisibleTextPolicyExemptContext {
  return (VISIBLE_TEXT_POLICY_EXEMPT_CONTEXTS as readonly string[]).includes(context);
}

export function visibleTextPolicyDecision(
  text: string,
  context: string = 'standard',
): TextPolicyDecision {
  if (isVisibleTextPolicyExemptContext(context)) {
    return { shouldReview: false, reasons: [] };
  }
  return textPolicyDecision(text);
}
