import type { ReactNode } from 'react';
import type { CaseRecord } from '../../core/models/case.model';

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric metric-default">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CaseOverviewDetail({
  selectedCase,
  notesCount,
  documentsCount,
  legalReferencesCount,
  processesCount,
  contextualTemplateActions
}: {
  selectedCase?: CaseRecord;
  notesCount: number;
  documentsCount: number;
  legalReferencesCount: number;
  processesCount: number;
  contextualTemplateActions?: ReactNode;
}) {
  return (
    <div className="case-detail-content">
      <h2>{selectedCase ? `${selectedCase.caseNumber} · ${selectedCase.displayName}` : 'Keine Fallakte ausgewählt'}</h2>
      <p>{selectedCase?.summary ?? 'Keine Kurzbeschreibung erfasst.'}</p>
      <div className="case-detail-metrics">
        <OverviewMetric label="Notizen" value={String(notesCount)} />
        <OverviewMetric label="Dokumente" value={String(documentsCount)} />
        <OverviewMetric label="Rechtsbezüge" value={String(legalReferencesCount)} />
        <OverviewMetric label="Maßnahmen" value={String(processesCount)} />
        <OverviewMetric label="Kategorie" value={selectedCase?.category ?? '—'} />
      </div>
      {contextualTemplateActions}
    </div>
  );
}
