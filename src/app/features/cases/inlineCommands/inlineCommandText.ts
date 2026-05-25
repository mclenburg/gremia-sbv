import type { InlineDeadlineDraft } from "./inlineCommandTypes";

export function formatInlineDeadlineDate(value: string): string {
  if (!value) return "offen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildInlineDeadlineText(draft: InlineDeadlineDraft): string {
  const dateLabel = formatInlineDeadlineDate(draft.dueAt);
  const title = draft.title.trim() || "Wiedervorlage";
  return `Frist bis ${dateLabel}: ${title}`;
}

export function replaceRange(
  value: string,
  start: number,
  length: number,
  replacement: string,
): string {
  return `${value.slice(0, start)}${replacement}${value.slice(start + length)}`;
}
