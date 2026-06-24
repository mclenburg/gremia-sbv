import type { ReactNode } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { StatusBadge } from '../../shared/components/StatusBadges';
import { ActivityJournalContextButton } from '../activity-journal/components/ActivityJournalContextButton';

export type CaseNextAction = {
  title: string;
  hint: string;
  tone: 'default' | 'warning' | 'danger';
};

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return <div className="metric metric-default"><span>{label}</span><strong>{value}</strong></div>;
}

function formatGermanDate(value?: string): string {
  if (!value) return 'kein Ablaufdatum';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('de-DE');
}

export function bindingLabel(record?: CaseRecord): string {
  if (!record) return '—';
  if (record.personBindingState === 'anonymous_request') return 'Anonyme Anfrage';
  if (record.personBindingState === 'migrated') return 'Migriert';
  if (record.personBindingState === 'active') return 'Aktiv personengebunden';
  if (record.personBindingState === 'legacy_unlinked') return 'Altfall prüfpflichtig';
  if (record.personBindingState === 'anonymized') return 'Person anonymisiert';
  if (record.personBindingState === 'person_deleted') return 'Person gelöscht';
  if (record.personBindingState === 'unlinking_in_progress') return 'Entknüpfung läuft';
  return record.personBindingState ?? '—';
}

export function resolveCaseNextAction(record?: CaseRecord): CaseNextAction {
  if (!record) {
    return {
      title: 'Fallakte auswählen',
      hint: 'Wählen Sie links eine Fallakte aus, um Vorgänge, Notizen, Dokumente und Fristen zu prüfen.',
      tone: 'default',
    };
  }

  if (record.handoverStatus === 'expired') {
    return {
      title: 'Übergabe abgelaufen',
      hint: 'Weiterbearbeitung nur nach ausdrücklicher Bestätigung und Begründung fortsetzen.',
      tone: 'danger',
    };
  }

  if (record.personBindingState === 'legacy_unlinked' || record.privacyReviewRequired) {
    return {
      title: 'Datenschutzprüfung vor Weiterbearbeitung',
      hint: record.privacyReviewReason ?? 'Personenbezug, Altfallstatus oder Aufbewahrungsgrund prüfen und dokumentieren.',
      tone: 'warning',
    };
  }

  if (record.priority === 'kritisch') {
    return {
      title: 'Kritische Fallakte aktiv prüfen',
      hint: 'Fristen, Arbeitgeberreaktionen und offene SBV-Stellungnahmen zuerst kontrollieren.',
      tone: 'danger',
    };
  }

  if (record.status === 'abgeschlossen') {
    return {
      title: 'Fallabschluss prüfen',
      hint: 'Dokumentation, Aufbewahrungsgrund und Datenschutz-Lifecycle kontrollieren.',
      tone: 'default',
    };
  }

  return {
    title: 'Fallarbeit fortführen',
    hint: 'Nächste Notiz, Frist oder Maßnahme im Fallbaum auswählen oder neu anlegen.',
    tone: 'default',
  };
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
  const nextAction = resolveCaseNextAction(selectedCase);
  return (
    <div className="case-detail-content">
      <div className="case-overview-heading">
        <div>
          <p className="industrial-kicker">Fallakte</p>
          <h2>{selectedCase ? `${selectedCase.caseNumber} · ${selectedCase.displayName}` : 'Keine Fallakte ausgewählt'}</h2>
          <p>{selectedCase?.summary ?? 'Keine Kurzbeschreibung erfasst.'}</p>
        </div>
        {selectedCase ? (
          <div className="case-overview-badges" aria-label="Fallstatus">
            <ActivityJournalContextButton
              context={{
                contextType: 'case',
                contextId: selectedCase.id,
                caseId: selectedCase.id,
                caseNumber: selectedCase.caseNumber,
                title: selectedCase.caseNumber,
              }}
              compact
            />
            <StatusBadge label={selectedCase.status} tone={selectedCase.status === 'abgeschlossen' ? 'success' : 'default'} />
            <StatusBadge label={selectedCase.priority} tone={selectedCase.priority === 'kritisch' ? 'danger' : selectedCase.priority === 'wichtig' ? 'warning' : 'default'} />
            <StatusBadge label={bindingLabel(selectedCase)} tone={isLegacy || selectedCase.privacyReviewRequired ? 'warning' : 'success'} />
          </div>
        ) : null}
      </div>

      <section className={`industrial-message case-next-action case-next-action-${nextAction.tone}`} aria-labelledby="case-next-action-label">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        <div>
          <span id="case-next-action-label" className="industrial-kicker">Nächster sauberer Schritt</span>
          <strong>{nextAction.title}</strong>
          <span>{nextAction.hint}</span>
        </div>
      </section>

      {isLegacy && (
        <div className="industrial-message industrial-message-warning" role="note" data-e2e="legacy-case-hint">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>Altfall ohne sicheren führenden Personenbezug. Bitte Zuordnung prüfen oder Datenschutzprüfung fortführen.</span>
          {onOpenLegacyBinding && <ToolbarButton onClick={onOpenLegacyBinding}>Legacy-Zuordnung prüfen</ToolbarButton>}
        </div>
      )}
      {isExpiredHandover && (
        <div className="industrial-message industrial-message-warning" role="alert" data-e2e="handover-expired-hint">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>Diese Fallakte stammt aus einer abgelaufenen Übergabe. Weitere Bearbeitung muss ausdrücklich bestätigt und begründet werden.</span>
          {onContinueExpiredHandover && <ToolbarButton onClick={onContinueExpiredHandover}>Weiterbearbeitung bestätigen</ToolbarButton>}
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
