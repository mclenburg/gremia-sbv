import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';

export type ProcessDetailBadge = {
  label: string;
  value: string;
};

export function ProcessDetailHeader({
  title,
  description,
  badgeLabel = 'Maßnahme',
  documentAction,
  badges
}: {
  title: string;
  description: string;
  badgeLabel?: string;
  documentAction?: () => void;
  badges: ProcessDetailBadge[];
}) {
  return (
    <>
      <div className="case-process-header">
        <div className="case-process-header-main">
          <div className="case-process-title-row">
            <span className="industrial-badge">{badgeLabel}</span>
            {documentAction && (
              <button type="button" className="case-process-document-link" onClick={documentAction}>
                <FileText className="h-3.5 w-3.5" />
                Dokumente
              </button>
            )}
          </div>
          <h2>{title}</h2>
        </div>
        <div className="case-process-badges" aria-label="Statusübersicht">
          {badges.map((badge) => (
            <span key={badge.label} className="case-process-badge"><strong>{badge.label}</strong>{badge.value}</span>
          ))}
        </div>
      </div>
      <p className="industrial-meta">{description}</p>
    </>
  );
}

export function ProcessSection({
  title,
  objective,
  children
}: {
  title: string;
  objective?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3>{title}</h3>
      {objective && <p className="industrial-meta">{objective}</p>}
      {children}
    </section>
  );
}
