import type { ReactNode } from "react";
import { IndustrialHelpButton } from "../help/IndustrialHelp";
import type { HelpRegistryId } from "../help/helpRegistry";
import { StatusBadge } from "./StatusBadges";
export type IndustrialPanelTone =
  | "default" | "ok" | "success" | "warning" | "danger" | "problem" | "info" | "muted" | "neutral";

function industrialToneClass(tone: IndustrialPanelTone = "default"): string { return `industrial-tone-${tone}`; }
function joinClassNames(...classes: Array<string | false | null | undefined>): string { return classes.filter(Boolean).join(" "); }

export function IndustrialPanel({
  children,
  kicker,
  title,
  description,
  actions,
  className,
  ariaLabel,
  helpId,
}: {
  children: ReactNode;
  kicker?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  ariaLabel?: string;
  helpId?: HelpRegistryId;
}) {
  return (
    <section
      className={joinClassNames("industrial-panel", className)}
      aria-label={ariaLabel}
    >
      {title ? (
        <IndustrialPanelHeader
          kicker={kicker}
          title={title}
          description={description}
          actions={actions}
          helpId={helpId}
        />
      ) : null}
      {children}
    </section>
  );
}
export function IndustrialRecordCard({
  children,
  tone = "default",
  selected = false,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  tone?: IndustrialPanelTone;
  selected?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <article
      className={joinClassNames(
        "industrial-record-card",
        industrialToneClass(tone),
        selected && "is-active",
        className,
      )}
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
    >
      {children}
    </article>
  );
}
export function IndustrialSelectionCard({
  children,
  selected = false,
  tone = "default",
  className,
  ariaLabel,
}: {
  children: ReactNode;
  selected?: boolean;
  tone?: IndustrialPanelTone;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <article
      className={joinClassNames(
        "industrial-selection-card",
        industrialToneClass(tone),
        selected && "is-active",
        className,
      )}
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
    >
      {children}
    </article>
  );
}
export function IndustrialStatusCard({
  title,
  statusLabel,
  tone = "default",
  children,
  detail,
}: {
  title: string;
  statusLabel: string;
  tone?: IndustrialPanelTone;
  children: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <article
      className={joinClassNames(
        "industrial-status-card",
        industrialToneClass(tone),
      )}
    >
      <div className="industrial-status-card-header">
        <h3>{title}</h3>
        <StatusBadge
          label={statusLabel}
          tone={tone}
          ariaLabel={`Status ${statusLabel}`}
        />
      </div>
      <p>{children}</p>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
export function IndustrialWarningPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClassNames("industrial-warning-panel", className)}
      role="note"
    >
      {children}
    </div>
  );
}
export function IndustrialDangerPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClassNames("industrial-danger-panel", className)}
      role="alert"
    >
      {children}
    </div>
  );
}
export function IndustrialPanelHeader({
  kicker,
  title,
  description,
  actions,
  compact = true,
  helpId,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
  helpId?: HelpRegistryId;
}) {
  return (
    <div className={`industrial-panel-header ${compact ? "compact" : ""}`}>
      <div>
        {kicker ? <p className="industrial-kicker">{kicker}</p> : null}
        <div className="industrial-section-title-row">
          <h2>{title}</h2>
          {helpId ? <IndustrialHelpButton helpId={helpId} label="Abschnittshilfe öffnen" /> : null}
        </div>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="industrial-action-row">{actions}</div> : null}
    </div>
  );
}
