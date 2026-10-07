import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import type { CreateDeadlineInput } from '../../../domain/models/deadline.model';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { EmptyState, WorkbenchDetailPanel, WorkbenchGrid, WorkbenchPage, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { buildParticipationViolationPrefillFromRecruiting, type SbvParticipationViolationPrefill } from '../participation-violations/sbvParticipationViolationViewLogic';
import { recruitingFollowUpInput, emptyParticipationForm } from './recruitingParticipationViewSupport';
import { RecruitingProcedureForm } from './RecruitingProcedureForm';
import { RecruitingInterviewEvents, RecruitingListPanel } from './RecruitingPanels';
import { useRecruitingParticipationState } from './useRecruitingParticipationState';
import { createRecruitingMutations } from './createRecruitingMutations';
import { RecruitingInterviewForm } from './RecruitingInterviewForm';
import { RecruitingFollowUpSection } from './RecruitingFollowUpSection';

export function RecruitingParticipationsView({
  onCreateDeadline,
  onOpenParticipationViolationPrefill,
  targetId,
  onTargetConsumed,
}: {
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onOpenParticipationViolationPrefill?: (prefill: SbvParticipationViolationPrefill) => void;
  targetId?: string;
  onTargetConsumed?: () => void;
}) {
  const state = useRecruitingParticipationState(targetId, onTargetConsumed);
  const {
    records, interviews, selected, form, interviewForm, loading, saving, error, message, createOpen,
    query, statusFilter, filteredRecords, riskHints, stats, creatingRef, announce, selectRecord,
    setSelectedId, setForm, setInterviews, setError, setMessage,
    setCreateOpen, setQuery, setStatusFilter, updateForm, updateInterviewForm,
  } = state;
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const { createRecord, updateRecord, addInterview } = createRecruitingMutations(state);

  async function createRecruitingFollowUp(kind: 'documents' | 'hearing') {
    if (!selected || !followUpDueAt) {
      setError('Bitte zuerst ein Wiedervorlagedatum eintragen.');
      return;
    }
    await onCreateDeadline(recruitingFollowUpInput(selected, followUpDueAt, kind));
    setMessage('Wiedervorlage wurde angelegt.');
    announce('Wiedervorlage wurde angelegt.');
    setFollowUpDueAt('');
  }

  function openParticipationViolationPrefill() {
    if (!selected) return;
    const prefill = buildParticipationViolationPrefillFromRecruiting(selected);
    if (!onOpenParticipationViolationPrefill) {
      setError('Die Verstoßprüfung kann aus dieser Ansicht nicht geöffnet werden.');
      return;
    }
    onOpenParticipationViolationPrefill(prefill);
    setMessage('Beteiligungsverstoß-Prüfung wurde vorbereitet. Speichern erfolgt erst in der Verstoßansicht.');
    announce('Beteiligungsverstoß-Prüfung wurde vorbereitet.');
  }

  return (
    <WorkbenchPage
      title="Stellenbesetzungen"
      kicker="§ 178 Abs. 2 SGB IX"
      description="SBV-Beteiligung bei Stellenbesetzungen nachhalten."
      helpId="recruiting.overview"
      compact
      actions={<IndustrialButton onClick={() => { creatingRef.current = true; setCreateOpen(true); setSelectedId(null); setForm(emptyParticipationForm()); setInterviews([]); }}><PlusCircle className="industrial-icon" aria-hidden="true" /> Stellenbesetzung anlegen</IndustrialButton>}
    >
      <ModuleFeedback items={[
        error ? { id: 'recruiting-error', tone: 'warning', message: error } : null,
        loading ? { id: 'recruiting-loading', message: 'Stellenbesetzungen werden geladen …' } : null,
        message ? { id: 'recruiting-message', tone: 'success', message } : null,
      ]} />

      <WorkbenchSummary
        ariaLabel="Stellenbesetzungen Kennzahlen"
        items={[
          { label: 'offen', value: stats.open },
          { label: 'Anhörung offen', value: stats.hearingOpen, tone: stats.hearingOpen > 0 ? 'warning' : 'default' },
          { label: 'Unterlagen offen', value: stats.documentsOpen, tone: stats.documentsOpen > 0 ? 'warning' : 'default' },
          { label: 'Verstoßprüfung', value: stats.review, tone: stats.review > 0 ? 'danger' : 'default' },
        ]}
      />

      <WorkbenchGrid>
        <RecruitingListPanel
          records={records}
          filteredRecords={filteredRecords}
          selectedId={selected?.id ?? null}
          loading={loading}
          query={query}
          statusFilter={statusFilter}
          onQueryChange={setQuery}
          onStatusFilterChange={setStatusFilter}
          onSelect={(id) => void selectRecord(id)}
        />

        <WorkbenchDetailPanel ariaLabel="Stellenbesetzung Detail" tabIndex={-1}>
          {selected || createOpen ? <RecruitingProcedureForm
            form={form}
            selected={selected}
            saving={saving}
            creating={createOpen}
            onFormChange={updateForm}
            onCreate={() => void createRecord()}
            onUpdate={() => void updateRecord()}
            onClose={() => { setCreateOpen(false); creatingRef.current = false; if (records[0]) void selectRecord(records[0].id); }}
          /> : <EmptyState title="Keine Stellenbesetzung ausgewählt" text="Wähle einen Vorgang aus der Liste oder lege über die Kopfzeile eine neue Stellenbesetzung an." />}

          {selected ? (
            <>
              <RecruitingInterviewForm interviewForm={interviewForm} saving={saving} updateInterviewForm={updateInterviewForm} onAdd={() => void addInterview()} />

              <RecruitingFollowUpSection dueAt={followUpDueAt} saving={saving} onDueAtChange={setFollowUpDueAt}
                onFollowUp={(kind) => void createRecruitingFollowUp(kind)} onViolationReview={openParticipationViolationPrefill} />

              <RecruitingInterviewEvents interviews={interviews} />

              {riskHints.length > 0 ? (
                <section className="industrial-message industrial-message-warning" role="note" aria-label="Prüfhinweise zur Stellenbesetzung">
                  <strong>Prüfhinweise:</strong> {riskHints.join(' · ')}
                </section>
              ) : null}
            </>
          ) : null}
        </WorkbenchDetailPanel>
      </WorkbenchGrid>
    </WorkbenchPage>
  );
}
