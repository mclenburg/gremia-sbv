import { useEffect, useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import type { ActivityJournalPrefill } from '../../../domain/models/activity-journal.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormSection } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DataTable, EmptyState, WorkbenchPage, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { useSbvParticipationViolations } from './hooks/useSbvParticipationViolations';
import { useParticipationViolationTarget } from './hooks/useParticipationViolationTarget';
import type { ViolationDraftContextInput } from './hooks/useViolationDraftContext';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { ViolationDraftForm, VIOLATION_DRAFT_FORM_ID } from './ViolationDraftForm';
import {
  getNextStatusActions,
  stageLabels,
  statusLabels,
  type SbvParticipationViolationPrefill,
  violationTypeLabels,
} from './sbvParticipationViolationViewLogic';
import type { SbvParticipationViolationRecord } from '../../../domain/models/sbv-participation-violation.model';

function ParticipationViolationRowActions({
  item,
  busy,
  documentBusyId,
  followUpBusyId,
  canOpenJournal,
  onChangeStatus,
  onGenerateDocument,
  onCreateFollowUp,
  onOpenJournalPrefill,
  onOpenCaseNode,
}: {
  item: SbvParticipationViolationRecord;
  busy: boolean;
  documentBusyId: string | null;
  followUpBusyId: string | null;
  canOpenJournal: boolean;
  onChangeStatus: ReturnType<typeof useSbvParticipationViolations>['changeStatus'];
  onGenerateDocument: ReturnType<typeof useSbvParticipationViolations>['generateDocument'];
  onCreateFollowUp: ReturnType<typeof useSbvParticipationViolations>['createFollowUp'];
  onOpenJournalPrefill: ReturnType<typeof useSbvParticipationViolations>['openJournalPrefill'];
  onOpenCaseNode?: (target: CaseNodeTarget) => void;
}) {
  const statusActions = getNextStatusActions(item.status);
  const hasCaseMeasureLink = Boolean(item.relatedCaseMeasureId && item.caseId && onOpenCaseNode);
  const hasFurtherActions = statusActions.length > 0 || hasCaseMeasureLink || !item.relatedDeadlineId || canOpenJournal;

  return (
    <div className="participation-violation-actions" aria-label={`Aktionen zu ${item.subject}`}>
      <ToolbarButton disabled={busy || documentBusyId === item.id} onClick={() => void onGenerateDocument(item)}>
        {documentBusyId === item.id ? 'PDF wird erzeugt …' : 'PDF erzeugen'}
      </ToolbarButton>
      {hasFurtherActions ? (
        <details className="participation-violation-more-actions">
          <summary>Weitere Schritte</summary>
          <div className="participation-violation-more-actions-menu">
            {statusActions.length ? <span className="industrial-meta">Status fortschreiben</span> : null}
            {statusActions.map((action) => (
              <ToolbarButton key={action.targetStatus} disabled={busy} onClick={() => void onChangeStatus(item, action.targetStatus)}>
                {action.label}
              </ToolbarButton>
            ))}
            {hasCaseMeasureLink ? (
              <ToolbarButton onClick={() => onOpenCaseNode?.({ caseId: item.caseId!, nodeType: 'participation', nodeId: item.relatedCaseMeasureId! })}>
                <ExternalLink className="industrial-icon" aria-hidden="true" /> Beteiligungsmaßnahme öffnen
              </ToolbarButton>
            ) : null}
            {!item.relatedDeadlineId ? (
              <ToolbarButton disabled={busy || followUpBusyId === item.id} onClick={() => void onCreateFollowUp(item)}>
                +7-Tage-Wiedervorlage
              </ToolbarButton>
            ) : null}
            {canOpenJournal ? (
              <ToolbarButton disabled={busy} onClick={() => void onOpenJournalPrefill(item)}>
                Journal-Vorlage
              </ToolbarButton>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ParticipationViolationDetailDialog({ item, state, onOpenCaseNode, onOpenJournalPrefill, onClose }: {
  item: SbvParticipationViolationRecord;
  state: ReturnType<typeof useSbvParticipationViolations>;
  onOpenCaseNode?: (target: CaseNodeTarget) => void;
  onOpenJournalPrefill?: (prefill: ActivityJournalPrefill) => void;
  onClose: () => void;
}) {
  return <IndustrialModal title={item.subject} kicker="Beteiligungsverstoß" onClose={onClose}
    actions={<ToolbarButton onClick={onClose}>Schließen</ToolbarButton>} wide>
    <dl className="industrial-meta-grid">
      <div><dt>Stufe</dt><dd>{stageLabels[item.stage]}</dd></div>
      <div><dt>Verstoßart</dt><dd>{violationTypeLabels[item.violationType]}</dd></div>
      <div><dt>Status</dt><dd>{statusLabels[item.status]}</dd></div>
      <div><dt>Maßnahme / Sachverhalt</dt><dd>{item.measureDescription}</dd></div>
      <div><dt>Was war falsch?</dt><dd>{item.wrongBehavior}</dd></div>
      <div><dt>Erforderliches Verhalten</dt><dd>{item.requiredBehavior}</dd></div>
      <div><dt>Rechtsgrundlage</dt><dd>{item.legalBasis}</dd></div>
      {item.followUpDueAt ? <div><dt>Wiedervorlage</dt><dd>{new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(item.followUpDueAt))}</dd></div> : null}
    </dl>
    <ParticipationViolationRowActions item={item} busy={state.busy} documentBusyId={state.documentBusyId}
      followUpBusyId={state.followUpBusyId} canOpenJournal={Boolean(onOpenJournalPrefill)}
      onChangeStatus={state.changeStatus} onGenerateDocument={state.generateDocument}
      onCreateFollowUp={state.createFollowUp} onOpenJournalPrefill={state.openJournalPrefill} onOpenCaseNode={onOpenCaseNode} />
  </IndustrialModal>;
}

export function SbvParticipationViolationsView({
  cases,
  measures,
  pendingPrefill,
  onPrefillConsumed,
  onOpenJournalPrefill,
  onOpenCaseNode,
  targetId,
  onTargetConsumed,
}: ViolationDraftContextInput & {
  pendingPrefill?: SbvParticipationViolationPrefill | null;
  onPrefillConsumed?: () => void;
  onOpenJournalPrefill?: (prefill: ActivityJournalPrefill) => void;
  onOpenCaseNode?: (target: CaseNodeTarget) => void;
  targetId?: string;
  onTargetConsumed?: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(Boolean(pendingPrefill));
  const state = useSbvParticipationViolations({ cases, measures, pendingPrefill, onPrefillConsumed, onOpenJournalPrefill });
  const { loadInitial } = state;
  const { targetItem, setTargetItem, targetError, targetLoading } = useParticipationViolationTarget(targetId, onTargetConsumed);
  const detailItem = targetItem ? state.items.find((item) => item.id === targetItem.id) ?? targetItem : null;

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);
  useEffect(() => { if (pendingPrefill) setCreateOpen(true); }, [pendingPrefill]);

  const rows = state.items.map((item) => ({
    id: item.id,
    cells: [
      <div key="subject" className="industrial-content-fragment"><strong>{item.subject}</strong><p className="industrial-settings-note">{item.measureDescription}</p></div>,
      stageLabels[item.stage],
      violationTypeLabels[item.violationType],
      statusLabels[item.status],
      item.legalBasis,
      <ParticipationViolationRowActions
        key="actions"
        item={item}
        busy={state.busy}
        documentBusyId={state.documentBusyId}
        followUpBusyId={state.followUpBusyId}
        canOpenJournal={Boolean(onOpenJournalPrefill)}
        onChangeStatus={state.changeStatus}
        onGenerateDocument={state.generateDocument}
        onCreateFollowUp={state.createFollowUp}
        onOpenJournalPrefill={state.openJournalPrefill}
        onOpenCaseNode={onOpenCaseNode}
      />,
    ],
  }));

  return (
    <WorkbenchPage
      kicker="§ 178 Abs. 2 SGB IX"
      title="Beteiligungsverstöße"
      description="Beteiligungsverstöße nachverfolgen und bearbeiten."
      helpId="participationViolations.sourceContext"
      actions={<IndustrialButton onClick={() => setCreateOpen(true)}><Plus className="industrial-icon" aria-hidden="true" /> Verstoß erfassen</IndustrialButton>}
    >
      <ModuleFeedback items={[
        state.message ? { id: 'participation-violation-message', tone: 'success', message: state.message } : null,
        state.error ? { id: 'participation-violation-error', tone: 'warning', message: state.error } : null,
        targetError ? { id: 'participation-violation-target-error', tone: 'warning', message: targetError } : null,
      ]} />

      {targetLoading ? <p role="status">Beteiligungsverstoß wird geladen.</p> : null}
      {detailItem ? <ParticipationViolationDetailDialog item={detailItem} state={state} onOpenCaseNode={onOpenCaseNode}
        onOpenJournalPrefill={onOpenJournalPrefill} onClose={() => setTargetItem(null)} /> : null}

      <WorkbenchSummary items={state.summaryItems} />

      {createOpen ? <IndustrialModal
        title="Beteiligungsverstoß erfassen"
        kicker="Neuer Vorgang"
        description="Der Ausgangskontext bestimmt, ob der Verstoß fallunabhängig oder mit einer Beteiligungsmaßnahme verknüpft wird."
        onClose={state.busy ? undefined : () => setCreateOpen(false)}
        closeOnEscape={!state.busy}
        wide
        actions={<>
          <ToolbarButton disabled={state.busy} onClick={() => setCreateOpen(false)}>Abbrechen</ToolbarButton>
          <IndustrialButton type="submit" form={VIOLATION_DRAFT_FORM_ID} disabled={state.busy} loading={state.busy}>
            <Plus className="industrial-icon" aria-hidden="true" /> Verstoß bewusst speichern
          </IndustrialButton>
        </>}
      >
        <ViolationDraftForm state={state} onCreated={() => setCreateOpen(false)} />
      </IndustrialModal> : null}
      <FormSection
        kicker="Nachverfolgung"
        title="Protokollierte Beteiligungsverstöße"
        description="Kontrollsicht für bereits protokollierte Vorgänge."
        helpId="participationViolations.tracking"
        className="participation-violations-tracking"
      >
        <DataTable
          headers={['Betreff', 'Stufe', 'Verstoßart', 'Status', 'Rechtskern', 'Aktion']}
          rows={rows}
          ariaLabel="Beteiligungsverstöße"
          empty={<EmptyState title="Keine Beteiligungsverstöße" text="Es sind noch keine Beteiligungsverstöße protokolliert." />}
        />
      </FormSection>
    </WorkbenchPage>
  );
}
