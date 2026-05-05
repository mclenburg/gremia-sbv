import type { ReactNode } from "react";

export type MeasureDetailFrameProps = {
  typeLabel: string;
  title: string;
  statusLabel: string;
  riskLevel?: "normal" | "erhoeht" | "kritisch" | string;
  riskLabel?: string;
  summary?: string;
  nextStep?: string;
  requiresFollowUp?: boolean;
  children: ReactNode;
};

export function MeasureDetailFrame({
  typeLabel,
  title,
  statusLabel,
  riskLevel = "normal",
  riskLabel,
  summary,
  nextStep,
  requiresFollowUp = false,
  children,
}: MeasureDetailFrameProps) {
  return (
    <article className="case-detail-content measure-detail-frame">
      <header className="measure-detail-header">
        <div className="measure-detail-header-row">
          <span className="industrial-badge">{typeLabel}</span>
          <span className="measure-status-badge">{statusLabel}</span>
          <span className="measure-risk-badge" data-risk={riskLevel}>
            {riskLabel ?? riskLevel}
          </span>
          {requiresFollowUp ? (
            <span className="measure-follow-up-badge">Nachbearbeitung</span>
          ) : null}
        </div>
        <h2 className="measure-detail-title">{title}</h2>
        {summary ? <p className="measure-detail-meta">{summary}</p> : null}
        {nextStep ? (
          <p className="measure-detail-meta">
            <strong>Nächster Schritt:</strong> {nextStep}
          </p>
        ) : null}
      </header>
      {children}
    </article>
  );
}
