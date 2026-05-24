export type StatusTone =
  | "default"
  | "ok"
  | "success"
  | "warning"
  | "danger"
  | "problem"
  | "info"
  | "muted"
  | "neutral";

export type RiskLike =
  | "low"
  | "medium"
  | "high"
  | "normal"
  | "important"
  | "critical"
  | "fatal"
  | "erhoeht"
  | "kritisch"
  | "info"
  | "warning"
  | "problem"
  | "ok"
  | "unknown";

export type DeadlineLikeState =
  | "hidden"
  | "upcoming"
  | "due_soon"
  | "critical"
  | "overdue"
  | "open"
  | "done"
  | "suspended"
  | "cancelled";

export type ProcessLikeStatus =
  | "open"
  | "in_review"
  | "reported"
  | "closed"
  | "done"
  | "overdue"
  | "suspended"
  | "cancelled"
  | "planned"
  | "requested"
  | "approved"
  | "completed"
  | "rejected"
  | "documented"
  | "offen"
  | "in_bearbeitung"
  | "ruhend"
  | "abgeschlossen";

export type ComplianceFindingLike =
  | "ok"
  | "warning"
  | "problem"
  | "info"
  | "low"
  | "medium"
  | "high";

function normalize(value: string | undefined | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export function normalizeStatusTone(tone: StatusTone): StatusTone {
  return tone === "problem" ? "danger" : tone;
}

export function riskLevelToTone(risk: RiskLike | string | undefined | null): StatusTone {
  switch (normalize(risk)) {
    case "high":
    case "critical":
    case "fatal":
    case "kritisch":
    case "problem":
      return "danger";
    case "medium":
    case "important":
    case "warning":
    case "erhoeht":
      return "warning";
    case "low":
    case "normal":
    case "ok":
      return "ok";
    case "info":
      return "info";
    default:
      return "default";
  }
}

export function deadlineStateToTone(state: DeadlineLikeState | string | undefined | null): StatusTone {
  switch (normalize(state)) {
    case "overdue":
    case "critical":
      return "danger";
    case "due_soon":
      return "warning";
    case "upcoming":
    case "open":
      return "info";
    case "done":
      return "ok";
    case "hidden":
    case "suspended":
    case "cancelled":
      return "muted";
    default:
      return "default";
  }
}

export function deadlineToTone(
  dueAt: string | Date | undefined | null,
  today: Date = new Date(),
): StatusTone {
  if (!dueAt) return "default";
  const dueDate = dueAt instanceof Date ? dueAt : new Date(dueAt);
  if (!isValidDate(dueDate) || !isValidDate(today)) return "default";

  const remainingMs = dueDate.getTime() - today.getTime();
  if (remainingMs < 0) return "danger";
  const remainingHours = remainingMs / 3_600_000;
  if (remainingHours <= 48) return "warning";
  return "info";
}

export function processStatusToTone(
  status: ProcessLikeStatus | string | undefined | null,
): StatusTone {
  switch (normalize(status)) {
    case "closed":
    case "done":
    case "completed":
    case "documented":
    case "abgeschlossen":
      return "ok";
    case "reported":
    case "approved":
      return "success";
    case "in_review":
    case "in_bearbeitung":
    case "requested":
    case "planned":
    case "open":
    case "offen":
      return "warning";
    case "overdue":
    case "rejected":
      return "danger";
    case "suspended":
    case "cancelled":
    case "ruhend":
      return "muted";
    default:
      return "default";
  }
}

export function complianceFindingToTone(
  finding: ComplianceFindingLike | string | undefined | null,
): StatusTone {
  switch (normalize(finding)) {
    case "ok":
    case "low":
      return "ok";
    case "warning":
    case "medium":
      return "warning";
    case "problem":
    case "high":
      return "danger";
    case "info":
      return "info";
    default:
      return "default";
  }
}
