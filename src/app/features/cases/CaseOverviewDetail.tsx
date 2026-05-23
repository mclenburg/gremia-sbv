import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return <div className="metric metric-default"><span>{label}</span><strong>{value}</strong></div>;
}

function formatGermanDate(value?: string): string {
  if (!value) return 'kein Ablaufdatum';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('de-DE');
}

function bindingLabel(record?: CaseRecord): string {
  if (!record) return '—';
  if (record.personBindingState === 'anonymous_request') return 'Anonyme Anfrage';
  if (record.personBindingState === 'migrated') return 'Migriert';
  if (record.personBindingState === 'active') return 'Aktiv personengebunden';
  if (record.personBindingState === 'legacy_unlinked') return 'Altfall prüfpflichtig';
  return record.personBindingState ?? '—';
}

export function CaseOverviewDetail({
  selectedCase,
  notesCount,
  documentsCount,
  legalReferencesCount,
  processesCount,
  contextualTemplateActions,
  onOpenLegacyBinding,
  onContinueExpiredHandover
}: {
  selectedCase?: CaseRecord;
  notesCount: number;
  documentsCount: number;
  legalReferencesCount: number;
  processesCount: number;
  contextualTemplateActions?: ReactNode;
  onOpenLegacyBinding?: () => void;
  onContinueExpiredHandover?: () => void;
}) {
  const isLegacy = selectedCase?.personBindingState === 'legacy_unlinked';
  const isExpiredHandover = selectedCase?.handoverStatus === 'expired';
  return (
    <div className="case-detail-content">
      <h2>{selectedCase ? `${selectedCase.caseNumber} · ${selectedCase.displayName}` : 'Keine Fallakte ausgewählt'}</h2>
      <p>{selectedCase?.summary ?? 'Keine Kurzbeschreibung erfasst.'}</p>
      {isLegacy && (
        <div className="industrial-message industrial-message-warning" role="note" data-e2e="legacy-case-hint">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>Altfall ohne sicheren führenden Personenbezug. Bitte Zuordnung prüfen oder Datenschutzprüfung fortführen.</span>
          {onOpenLegacyBinding && <button type="button" className="industrial-secondary-button compact" onClick={onOpenLegacyBinding}>Legacy-Zuordnung prüfen</button>}
        </div>
      )}
      {isExpiredHandover && (
        <div className="industrial-message industrial-message-warning" role="alert" data-e2e="handover-expired-hint">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>Diese Fallakte stammt aus einer abgelaufenen Übergabe. Weitere Bearbeitung muss ausdrücklich bestätigt und begründet werden.</span>
          {onContinueExpiredHandover && <button type="button" className="industrial-secondary-button compact" onClick={onContinueExpiredHandover}>Weiterbearbeitung bestätigen</button>}
        </div>
      )}
      {selectedCase?.handoverImportId && (
        <p className="case-handover-validity">Vertretungsdaten gültig bis: <strong>{formatGermanDate(selectedCase.handoverValidUntil)}</strong></p>
      )}

      <div className="case-detail-metrics">
        <OverviewMetric label="Notizen" value={String(notesCount)} />
        <OverviewMetric label="Dokumente" value={String(documentsCount)} />
        <OverviewMetric label="Rechtsbezüge" value={String(legalReferencesCount)} />
        <OverviewMetric label="Maßnahmen" value={String(processesCount)} />
        <OverviewMetric label="Kategorie" value={selectedCase?.category ?? '—'} />
        <OverviewMetric label="Personenbindung" value={bindingLabel(selectedCase)} />
      </div>
      {contextualTemplateActions}
    </div>
  );
}
