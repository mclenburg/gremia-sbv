import type { ReactNode } from "react";
import {
  complianceFindingToTone,
  deadlineStateToTone,
  deadlineToTone,
  normalizeStatusTone,
  processStatusToTone,
  riskLevelToTone,
  type StatusTone,
} from "../status/statusTone";

type BadgeProps = {
  label: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
  ariaLabel?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function StatusBadge({
  label,
  tone = "default",
  icon,
  ariaLabel,
  className,
}: BadgeProps) {
  const normalizedTone = normalizeStatusTone(tone);
  return (
    <span
      className={joinClassNames(
        "industrial-status-badge",
        `industrial-status-badge-${normalizedTone}`,
        className,
      )}
      aria-label={ariaLabel}
    >
      {icon ? <span className="industrial-status-badge-icon" aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </span>
  );
}

export function RiskBadge({
  risk,
  label,
  ariaLabel,
}: {
  risk: string | undefined | null;
  label?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <StatusBadge
      label={label ?? risk ?? "Unbekannt"}
      tone={riskLevelToTone(risk)}
      ariaLabel={ariaLabel ?? `Risiko ${String(label ?? risk ?? "unbekannt")}`}
    />
  );
}

export function DeadlineBadge({
  state,
  dueAt,
  today,
  label,
  ariaLabel,
}: {
  state?: string | null;
  dueAt?: string | Date | null;
  today?: Date;
  label: ReactNode;
  ariaLabel?: string;
}) {
  const tone = state ? deadlineStateToTone(state) : deadlineToTone(dueAt, today);
  return <StatusBadge label={label} tone={tone} ariaLabel={ariaLabel} />;
}

export function ComplianceBadge({
  finding,
  label,
  ariaLabel,
}: {
  finding: string | undefined | null;
  label?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <StatusBadge
      label={label ?? finding ?? "Unbekannt"}
      tone={complianceFindingToTone(finding)}
      ariaLabel={ariaLabel ?? `Compliance ${String(label ?? finding ?? "unbekannt")}`}
    />
  );
}

export function ProcessStatusBadge({
  status,
  label,
  ariaLabel,
}: {
  status: string | undefined | null;
  label?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <StatusBadge
      label={label ?? status ?? "Unbekannt"}
      tone={processStatusToTone(status)}
      ariaLabel={ariaLabel ?? `Status ${String(label ?? status ?? "unbekannt")}`}
    />
  );
}
