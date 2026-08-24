import { useEffect, useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import type { ActivityJournalPrefill } from '../../../domain/models/activity-journal.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormSection } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DataTable, EmptyState, WorkbenchGrid, WorkbenchPage, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { useSbvParticipationViolations } from './hooks/useSbvParticipationViolations';
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

export function SbvParticipationViolationsView({
  cases,
  measures,
  pendingPrefill,
  onPrefillConsumed,
  onOpenJournalPrefill,
  onOpenCaseNode,
}: ViolationDraftContextInput & {
  pendingPrefill?: SbvParticipationViolationPrefill | null;
  onPrefillConsumed?: () => void;
  onOpenJournalPrefill?: (prefill: ActivityJournalPrefill) => void;
  onOpenCaseNode?: (target: CaseNodeTarget) => void;
}) {
  const [createOpen, setCreateOpen] = useState(Boolean(pendingPrefill));
  const state = useSbvParticipationViolations({ cases, measures, pendingPrefill, onPrefillConsumed, onOpenJournalPrefill });
  const { loadInitial } = state;

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);
  useEffect(() => { if (pendingPrefill) setCreateOpen(true); }, [pendingPrefill]);

  const rows = state.items.map((item) => ({
    id: item.id,
    cells: [
      <div key="subject"><strong>{item.subject}</strong><p className="industrial-settings-note mt-1">{item.measureDescription}</p></div>,
      stageLabels[item.stage],
      violationTypeLabels[item.violationType],
      statusLabels[item.status],
      item.legalBasis,
      <div key="actions" className="industrial-search-actions">
        {getNextStatusActions(item.status).map((action) => (
          <ToolbarButton key={action.targetStatus} disabled={state.busy} onClick={() => void state.changeStatus(item, action.targetStatus)}>
            {action.label}
          </ToolbarButton>
        ))}
        {item.relatedCaseMeasureId && item.caseId && onOpenCaseNode ? <ToolbarButton onClick={() => onOpenCaseNode({ caseId: item.caseId!, nodeType: 'participation', nodeId: item.relatedCaseMeasureId })}><ExternalLink className="h-4 w-4" aria-hidden="true" /> Beteiligungsmaßnahme</ToolbarButton> : null}
        <ToolbarButton disabled={state.busy || state.documentBusyId === item.id} onClick={() => void state.generateDocument(item)}>PDF erzeugen</ToolbarButton>
        <ToolbarButton disabled={state.busy || state.followUpBusyId === item.id || Boolean(item.relatedDeadlineId)} onClick={() => void state.createFollowUp(item)}>+7-Tage-Wiedervorlage</ToolbarButton>
        <ToolbarButton disabled={state.busy || !onOpenJournalPrefill} onClick={() => void state.openJournalPrefill(item)}>Journal-Vorlage</ToolbarButton>
      </div>,
    ],
  }));

  return (
    <WorkbenchPage
      kicker="§ 178 Abs. 2 SGB IX"
      title="Beteiligungsverstöße"
      description="Beteiligungsverstöße nachverfolgen und bearbeiten."
      helpId="participationViolations.sourceContext"
      actions={<IndustrialButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Verstoß erfassen</IndustrialButton>}
    >
      <ModuleFeedback items={[
        state.message ? { id: 'participation-violation-message', tone: 'success', message: state.message } : null,
        state.error ? { id: 'participation-violation-error', tone: 'warning', message: state.error } : null,
      ]} />

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
            <Plus className="h-4 w-4" aria-hidden="true" /> Verstoß bewusst speichern
          </IndustrialButton>
        </>}
      >
        <ViolationDraftForm state={state} onCreated={() => setCreateOpen(false)} />
      </IndustrialModal> : null}
      <WorkbenchGrid>
        <FormSection
          kicker="Nachverfolgung"
          title="Protokollierte Beteiligungsverstöße"
          description="Kontrollsicht für bereits protokollierte Vorgänge."
          helpId="participationViolations.tracking"
        >
          <DataTable
            headers={['Betreff', 'Stufe', 'Verstoßart', 'Status', 'Rechtskern', 'Aktion']}
            rows={rows}
            ariaLabel="Beteiligungsverstöße"
            empty={<EmptyState title="Keine Beteiligungsverstöße" text="Es sind noch keine Beteiligungsverstöße protokolliert." />}
          />
        </FormSection>
      </WorkbenchGrid>
    </WorkbenchPage>
  );
}
