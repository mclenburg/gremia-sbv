import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, CalendarClock, ClipboardList, PlusCircle, Save } from 'lucide-react';
import type { CreateDeadlineInput } from '../../core/models/deadline.model';
import type {
  CreateRecruitingInterviewEventInput,
  CreateRecruitingParticipationInput,
  RecruitingAccessibilityCheckStatus,
  RecruitingApplicantReferenceMode,
  RecruitingApplicantStatus,
  RecruitingInterviewEventRecord,
  RecruitingParticipationRecord,
  RecruitingParticipationStatus,
  RecruitingViolationReviewReason,
  UpdateRecruitingParticipationInput,
} from '../../core/models/recruiting-participation.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { GhostButton, IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { CheckboxField, DateInput, FormSection, SelectInput, TextInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { WorkbenchDetailPanel, WorkbenchGrid, WorkbenchListPanel, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { ActivityJournalContextButton } from '../activity-journal/components/ActivityJournalContextButton';
import { buildParticipationViolationPrefillFromRecruiting, type SbvParticipationViolationPrefill } from '../participation-violations/sbvParticipationViolationViewLogic';
import {
  formatRecruitingDate,
  getRecruitingRiskHints,
  recruitingAccessibilityStatusLabels,
  recruitingApplicantReferenceModeLabels,
  recruitingApplicantStatusLabels,
  recruitingStatusLabels,
  recruitingViolationReviewReasonLabels,
  suggestNextRecruitingStatus,
} from './recruitingViewLogic';

type ParticipationFormState = {
  vacancyTitle: string;
  vacancyReference: string;
  department: string;
  location: string;
  status: RecruitingParticipationStatus;
  employerNoticeDate: string;
  documentsReceivedDate: string;
  documentsComplete: boolean;
  hasSeverelyDisabledApplicants: boolean;
  severelyDisabledApplicantCount: string;
  sbvInvitedToAllKnownInterviews: boolean;
  sbvParticipated: boolean;
  hearingRequestedDate: string;
  hearingDueDate: string;
  statementSubmittedDate: string;
  decisionKnownDate: string;
  decisionBeforeHearing: boolean;
  brProcedureDate: string;
  flaggedForViolationReview: boolean;
  violationReviewReason: RecruitingViolationReviewReason;
  notes: string;
};

type InterviewFormState = {
  interviewDate: string;
  applicantRef: string;
  applicantReferenceMode: RecruitingApplicantReferenceMode;
  applicantStatus: RecruitingApplicantStatus;
  sbvInvited: boolean;
  sbvInvitationDate: string;
  sbvAttended: boolean;
  accessibilityCheckStatus: RecruitingAccessibilityCheckStatus;
  followUpNeeded: boolean;
  proceduralNote: string;
};

const statusOptions = Object.entries(recruitingStatusLabels).map(([value, label]) => ({ value, label }));
const applicantStatusOptions = Object.entries(recruitingApplicantStatusLabels).map(([value, label]) => ({ value, label }));
const applicantReferenceModeOptions = Object.entries(recruitingApplicantReferenceModeLabels).map(([value, label]) => ({ value, label }));
const accessibilityOptions = Object.entries(recruitingAccessibilityStatusLabels).map(([value, label]) => ({ value, label }));
const violationReasonOptions = Object.entries(recruitingViolationReviewReasonLabels).map(([value, label]) => ({ value, label }));

function toDateInput(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function fromDateInput(value: string): string | undefined {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : undefined;
}

function emptyParticipationForm(): ParticipationFormState {
  return {
    vacancyTitle: '',
    vacancyReference: '',
    department: '',
    location: '',
    status: 'draft',
    employerNoticeDate: '',
    documentsReceivedDate: '',
    documentsComplete: false,
    hasSeverelyDisabledApplicants: true,
    severelyDisabledApplicantCount: '',
    sbvInvitedToAllKnownInterviews: false,
    sbvParticipated: false,
    hearingRequestedDate: '',
    hearingDueDate: '',
    statementSubmittedDate: '',
    decisionKnownDate: '',
    decisionBeforeHearing: false,
    brProcedureDate: '',
    flaggedForViolationReview: false,
    violationReviewReason: 'manual_review',
    notes: '',
  };
}

function formFromRecord(record: RecruitingParticipationRecord): ParticipationFormState {
  return {
    vacancyTitle: record.vacancyTitle,
    vacancyReference: record.vacancyReference ?? '',
    department: record.department ?? '',
    location: record.location ?? '',
    status: record.status,
    employerNoticeDate: toDateInput(record.employerNoticeDate),
    documentsReceivedDate: toDateInput(record.documentsReceivedDate),
    documentsComplete: record.documentsComplete,
    hasSeverelyDisabledApplicants: record.hasSeverelyDisabledApplicants,
    severelyDisabledApplicantCount: record.severelyDisabledApplicantCount === undefined ? '' : String(record.severelyDisabledApplicantCount),
    sbvInvitedToAllKnownInterviews: Boolean(record.sbvInvitedToAllKnownInterviews),
    sbvParticipated: Boolean(record.sbvParticipated),
    hearingRequestedDate: toDateInput(record.hearingRequestedDate),
    hearingDueDate: toDateInput(record.hearingDueDate),
    statementSubmittedDate: toDateInput(record.statementSubmittedDate),
    decisionKnownDate: toDateInput(record.decisionKnownDate),
    decisionBeforeHearing: record.decisionBeforeHearing,
    brProcedureDate: toDateInput(record.brProcedureDate),
    flaggedForViolationReview: record.flaggedForViolationReview,
    violationReviewReason: record.violationReviewReason ?? 'manual_review',
    notes: record.notes ?? '',
  };
}

function inputFromForm(form: ParticipationFormState): CreateRecruitingParticipationInput | UpdateRecruitingParticipationInput {
  return {
    vacancyTitle: form.vacancyTitle.trim(),
    vacancyReference: form.vacancyReference.trim() || undefined,
    department: form.department.trim() || undefined,
    location: form.location.trim() || undefined,
    status: form.status,
    employerNoticeDate: fromDateInput(form.employerNoticeDate),
    documentsReceivedDate: fromDateInput(form.documentsReceivedDate),
    documentsComplete: form.documentsComplete,
    hasSeverelyDisabledApplicants: form.hasSeverelyDisabledApplicants,
    severelyDisabledApplicantCount: form.severelyDisabledApplicantCount.trim() ? Number(form.severelyDisabledApplicantCount) : undefined,
    sbvInvitedToAllKnownInterviews: form.sbvInvitedToAllKnownInterviews,
    sbvParticipated: form.sbvParticipated,
    hearingRequestedDate: fromDateInput(form.hearingRequestedDate),
    hearingDueDate: fromDateInput(form.hearingDueDate),
    statementSubmittedDate: fromDateInput(form.statementSubmittedDate),
    decisionKnownDate: fromDateInput(form.decisionKnownDate),
    decisionBeforeHearing: form.decisionBeforeHearing,
    brProcedureDate: fromDateInput(form.brProcedureDate),
    flaggedForViolationReview: form.flaggedForViolationReview,
    violationReviewReason: form.flaggedForViolationReview ? form.violationReviewReason : undefined,
    notes: form.notes.trim() || undefined,
  };
}

function emptyInterviewForm(): InterviewFormState {
  return {
    interviewDate: new Date().toISOString().slice(0, 10),
    applicantRef: '',
    applicantReferenceMode: 'anonymous_reference',
    applicantStatus: 'severely_disabled',
    sbvInvited: true,
    sbvInvitationDate: '',
    sbvAttended: false,
    accessibilityCheckStatus: 'not_checked',
    followUpNeeded: false,
    proceduralNote: '',
  };
}

function interviewInputFromForm(recruitingParticipationId: string, form: InterviewFormState): CreateRecruitingInterviewEventInput {
  return {
    recruitingParticipationId,
    interviewDate: fromDateInput(form.interviewDate) ?? new Date().toISOString(),
    applicantRef: form.applicantRef.trim() || undefined,
    applicantReferenceMode: form.applicantReferenceMode,
    applicantStatus: form.applicantStatus,
    sbvInvited: form.sbvInvited,
    sbvInvitationDate: fromDateInput(form.sbvInvitationDate),
    sbvAttended: form.sbvAttended,
    accessibilityCheckStatus: form.accessibilityCheckStatus,
    followUpNeeded: form.followUpNeeded,
    proceduralNote: form.proceduralNote.trim() || undefined,
  };
}

export function RecruitingParticipationsView({
  onCreateDeadline,
  onOpenParticipationViolationPrefill,
}: {
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onOpenParticipationViolationPrefill?: (prefill: SbvParticipationViolationPrefill) => void;
}) {
  const [records, setRecords] = useState<RecruitingParticipationRecord[]>([]);
  const [interviews, setInterviews] = useState<RecruitingInterviewEventRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ParticipationFormState>(() => emptyParticipationForm());
  const [interviewForm, setInterviewForm] = useState<InterviewFormState>(() => emptyInterviewForm());
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const announce = useAnnouncer();

  const selected = useMemo(() => records.find((record) => record.id === selectedId) ?? null, [records, selectedId]);
  const riskHints = selected ? getRecruitingRiskHints(selected) : [];

  async function reload(preferredId?: string | null) {
    setLoading(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.recruitingParticipations) throw new Error('Stellenbesetzungsdienst ist nicht erreichbar.');
      const rows = await bridge.recruitingParticipations.list();
      setRecords(rows);
      const nextId = preferredId ?? selectedId ?? rows[0]?.id ?? null;
      const resolvedId = nextId && rows.some((row) => row.id === nextId) ? nextId : rows[0]?.id ?? null;
      setSelectedId(resolvedId);
      if (resolvedId) {
        const detail = rows.find((row) => row.id === resolvedId) ?? null;
        if (detail) setForm(formFromRecord(detail));
        const interviewRows = await bridge.recruitingParticipations.listInterviews(resolvedId);
        setInterviews(interviewRows);
      } else {
        setForm(emptyParticipationForm());
        setInterviews([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Stellenbesetzungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload(null);
  }, []);

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  function updateForm(patch: Partial<ParticipationFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateInterviewForm(patch: Partial<InterviewFormState>) {
    setInterviewForm((current) => ({ ...current, ...patch }));
  }

  async function selectRecord(id: string) {
    const record = records.find((item) => item.id === id);
    setSelectedId(id);
    if (record) setForm(formFromRecord(record));
    try {
      const bridge = await waitForBridge();
      const rows = await bridge?.recruitingParticipations?.listInterviews(id) ?? [];
      setInterviews(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Vorstellungsgespräche konnten nicht geladen werden.');
    }
  }

  async function createRecord() {
    setSaving(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.recruitingParticipations) throw new Error('Stellenbesetzungsdienst ist nicht erreichbar.');
      const created = await bridge.recruitingParticipations.create(inputFromForm(form) as CreateRecruitingParticipationInput);
      setMessage('Stellenbesetzung wurde angelegt.');
      announce('Stellenbesetzung wurde angelegt.');
      await reload(created.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Stellenbesetzung konnte nicht angelegt werden.');
    } finally {
      setSaving(false);
    }
  }

  async function updateRecord() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.recruitingParticipations) throw new Error('Stellenbesetzungsdienst ist nicht erreichbar.');
      await bridge.recruitingParticipations.update(selected.id, inputFromForm(form) as UpdateRecruitingParticipationInput);
      setMessage('Stellenbesetzung wurde aktualisiert.');
      announce('Stellenbesetzung wurde aktualisiert.');
      await reload(selected.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Stellenbesetzung konnte nicht aktualisiert werden.');
    } finally {
      setSaving(false);
    }
  }

  async function addInterview() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.recruitingParticipations) throw new Error('Stellenbesetzungsdienst ist nicht erreichbar.');
      await bridge.recruitingParticipations.addInterview(interviewInputFromForm(selected.id, interviewForm));
      setInterviewForm(emptyInterviewForm());
      setMessage('Vorstellungsgespräch wurde als Beteiligungsereignis erfasst.');
      announce('Vorstellungsgespräch wurde erfasst.');
      await reload(selected.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Vorstellungsgespräch konnte nicht erfasst werden.');
    } finally {
      setSaving(false);
    }
  }

  async function createRecruitingFollowUp(kind: 'documents' | 'hearing') {
    if (!selected || !followUpDueAt) {
      setError('Bitte zuerst ein Wiedervorlagedatum eintragen.');
      return;
    }
    const title = kind === 'documents'
      ? `Stellenbesetzung: Unterlagen nachhalten – ${selected.vacancyTitle}`
      : `Stellenbesetzung: Anhörung vor Auswahlentscheidung – ${selected.vacancyTitle}`;
    await onCreateDeadline({
      processType: 'recruiting_participation',
      processId: selected.id,
      deadlineType: 'follow_up',
      title,
      confidentialTitle: title,
      description: kind === 'documents'
        ? 'Fallaktenunabhängige Wiedervorlage zur Nachforderung oder Prüfung vollständiger Stellenbesetzungsunterlagen.'
        : 'Fallaktenunabhängige Wiedervorlage zur Anhörung der SBV vor Auswahlentscheidung.',
      dueAt: fromDateInput(followUpDueAt) ?? new Date().toISOString(),
      severity: kind === 'hearing' ? 'important' : 'normal',
      calculationMode: 'manual',
      isLegalDeadline: false,
      sourceEvent: `recruiting_participation.${kind}_follow_up`,
    });
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

  const stats = useMemo(() => ({
    open: records.filter((record) => record.status !== 'closed').length,
    hearingOpen: records.filter((record) => record.hasSeverelyDisabledApplicants && !record.statementSubmittedDate && !record.decisionKnownDate).length,
    documentsOpen: records.filter((record) => record.hasSeverelyDisabledApplicants && !record.documentsComplete).length,
    review: records.filter((record) => record.flaggedForViolationReview).length,
  }), [records]);

  return (
    <ModuleFrame
      title="Stellenbesetzungen"
      kicker="§ 178 Abs. 2 SGB IX"
      description="Fallaktenunabhängige Nachhaltung von Stellenbesetzungsverfahren mit schwerbehinderten oder gleichgestellten Bewerbungen. Fokus: Beteiligung, Unterlagen und Anhörung der SBV vor Auswahlentscheidung – kein Gesprächsprotokoll."
      compact
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
        actions={<IndustrialButton variant="secondary" onClick={() => { setSelectedId(null); setForm(emptyParticipationForm()); setInterviews([]); }}>Neue Stellenbesetzung</IndustrialButton>}
      />

      <WorkbenchGrid>
        <WorkbenchListPanel ariaLabel="Liste der Stellenbesetzungen">
          {records.length === 0 && !loading ? <div className="industrial-empty-state">Noch keine Stellenbesetzung dokumentiert.</div> : null}
          {records.map((record) => {
            const hints = getRecruitingRiskHints(record);
            return (
              <GhostButton
                key={record.id}
                className={`industrial-record-card industrial-tone-${record.flaggedForViolationReview ? 'danger' : hints.length > 0 ? 'warning' : 'default'} ${selected?.id === record.id ? 'is-active' : ''}`}
                onClick={() => void selectRecord(record.id)}
                aria-current={selected?.id === record.id ? 'true' : undefined}
              >
                <span className="industrial-kicker">{record.vacancyReference || 'ohne Kennziffer'}</span>
                <strong>{record.vacancyTitle}</strong>
                <span>{record.department || 'Organisationseinheit offen'} · {recruitingStatusLabels[record.status]}</span>
                <span>{record.interviewCount} Gespräch(e) · Anhörung bis {formatRecruitingDate(record.hearingDueDate)}</span>
                {hints.length > 0 ? <span className="participation-card-warning"><AlertTriangle className="h-3.5 w-3.5" /> {hints.join(' · ')}</span> : null}
              </GhostButton>
            );
          })}
        </WorkbenchListPanel>

        <WorkbenchDetailPanel ariaLabel="Stellenbesetzung Detail">
          <FormSection
            kicker="Verfahrensdaten"
            title={selected ? 'Stellenbesetzung bearbeiten' : 'Stellenbesetzung anlegen'}
            description="Dokumentiere nur den Verfahrensstand. Keine Gesprächsinhalte, Diagnosen oder Eignungsbewertungen erfassen."
            actions={selected ? (
              <ActivityJournalContextButton
                compact
                label="Tätigkeit erfassen"
                context={{
                  contextType: 'recruiting_participation',
                  contextId: selected.id,
                  title: selected.vacancyTitle,
                  category: 'participation',
                }}
              />
            ) : null}
          >
            <div className="industrial-form-grid">
              <TextInput label="Stelle / Bezeichnung" required value={form.vacancyTitle} onValueChange={(value) => updateForm({ vacancyTitle: value })} />
              <TextInput label="Kennziffer" value={form.vacancyReference} onValueChange={(value) => updateForm({ vacancyReference: value })} helpText="Stellenkennziffer, keine Bewerberreferenz." />
              <TextInput label="Organisationseinheit" value={form.department} onValueChange={(value) => updateForm({ department: value })} />
              <TextInput label="Ort / Standort" value={form.location} onValueChange={(value) => updateForm({ location: value })} />
              <SelectInput label="Status" value={form.status} options={statusOptions} onValueChange={(value) => updateForm({ status: value as RecruitingParticipationStatus })} />
              <DateInput label="Unterrichtung erhalten" value={form.employerNoticeDate} onValueChange={(value) => updateForm({ employerNoticeDate: value })} />
              <DateInput label="Unterlagen erhalten" value={form.documentsReceivedDate} onValueChange={(value) => updateForm({ documentsReceivedDate: value })} />
              <DateInput label="Anhörung angefordert am" value={form.hearingRequestedDate} onValueChange={(value) => updateForm({ hearingRequestedDate: value })} />
              <DateInput label="Anhörung / Stellungnahme bis" value={form.hearingDueDate} onValueChange={(value) => updateForm({ hearingDueDate: value })} />
              <DateInput label="Stellungnahme abgegeben" value={form.statementSubmittedDate} onValueChange={(value) => updateForm({ statementSubmittedDate: value })} />
              <DateInput label="Entscheidung bekannt" value={form.decisionKnownDate} onValueChange={(value) => updateForm({ decisionKnownDate: value })} />
              <DateInput label="BR-Verfahren / Vorlage bekannt" value={form.brProcedureDate} onValueChange={(value) => updateForm({ brProcedureDate: value })} />
              <TextInput label="Anzahl bekannter schwerbehinderter/gleichgestellter Bewerbungen" type="number" min="0" value={form.severelyDisabledApplicantCount} onValueChange={(value) => updateForm({ severelyDisabledApplicantCount: value })} />
              <CheckboxField label="Schwerbehinderte / gleichgestellte Bewerbung bekannt" checked={form.hasSeverelyDisabledApplicants} onCheckedChange={(checked) => updateForm({ hasSeverelyDisabledApplicants: checked })} />
              <CheckboxField label="Unterlagen vollständig" checked={form.documentsComplete} onCheckedChange={(checked) => updateForm({ documentsComplete: checked })} />
              <CheckboxField label="SBV zu allen bekannten Gesprächen eingeladen" checked={form.sbvInvitedToAllKnownInterviews} onCheckedChange={(checked) => updateForm({ sbvInvitedToAllKnownInterviews: checked })} />
              <CheckboxField label="SBV hat teilgenommen" checked={form.sbvParticipated} onCheckedChange={(checked) => updateForm({ sbvParticipated: checked })} />
              <CheckboxField label="Entscheidung vor SBV-Anhörung dokumentiert" checked={form.decisionBeforeHearing} onCheckedChange={(checked) => updateForm({ decisionBeforeHearing: checked, flaggedForViolationReview: checked ? true : form.flaggedForViolationReview, violationReviewReason: checked ? 'decision_before_hearing' : form.violationReviewReason })} />
              <CheckboxField label="Zur Verstoßprüfung vormerken" checked={form.flaggedForViolationReview} onCheckedChange={(checked) => updateForm({ flaggedForViolationReview: checked })} helpText="Es wird noch kein Beteiligungsverstoß angelegt. Nutze die separate Aktion zur bewussten Verstoßprüfung." />
              {form.flaggedForViolationReview ? <SelectInput label="Prüfanlass" value={form.violationReviewReason} options={violationReasonOptions} onValueChange={(value) => updateForm({ violationReviewReason: value as RecruitingViolationReviewReason })} /> : null}
              <TextareaInput label="Verfahrensnotiz" wide value={form.notes} onValueChange={(value) => updateForm({ notes: value })} helpText="Keine Diagnosen, Gesprächsinhalte oder Eignungsbewertungen dokumentieren." />
            </div>
            <div className="industrial-action-row mt-4">
              {selected ? (
                <IndustrialButton loading={saving} onClick={() => void updateRecord()}><Save className="h-4 w-4" /> Speichern</IndustrialButton>
              ) : (
                <IndustrialButton loading={saving} onClick={() => void createRecord()}><PlusCircle className="h-4 w-4" /> Stellenbesetzung anlegen</IndustrialButton>
              )}
              {selected ? (
                <ToolbarButton onClick={() => updateForm({ status: suggestNextRecruitingStatus({ ...selected, ...inputFromForm(form) } as RecruitingParticipationRecord) })}>Status vorschlagen</ToolbarButton>
              ) : null}
            </div>
          </FormSection>

          {selected ? (
            <>
              <FormSection kicker="Vorstellungsgespräche" title="Beteiligungsereignis hinzufügen" description="Erfasst wird nur, ob und wie die SBV beteiligt war. Kein inhaltliches Gesprächsprotokoll.">
                <div className="industrial-form-grid">
                  <DateInput label="Gesprächsdatum" value={interviewForm.interviewDate} onValueChange={(value) => updateInterviewForm({ interviewDate: value })} />
                  <TextInput label="Bewerbungsreferenz" value={interviewForm.applicantRef} onValueChange={(value) => updateInterviewForm({ applicantRef: value })} helpText="Standard ist eine anonyme Referenz wie Bewerbung 1. Klarnamen nur bewusst verwenden." />
                  <SelectInput label="Referenzmodus" value={interviewForm.applicantReferenceMode} options={applicantReferenceModeOptions} onValueChange={(value) => updateInterviewForm({ applicantReferenceMode: value as RecruitingApplicantReferenceMode })} />
                  <SelectInput label="Schutzstatus im Verfahren" value={interviewForm.applicantStatus} options={applicantStatusOptions} onValueChange={(value) => updateInterviewForm({ applicantStatus: value as RecruitingApplicantStatus })} />
                  <DateInput label="SBV-Einladung am" value={interviewForm.sbvInvitationDate} onValueChange={(value) => updateInterviewForm({ sbvInvitationDate: value })} />
                  <SelectInput label="Barrierefreiheit Gespräch" value={interviewForm.accessibilityCheckStatus} options={accessibilityOptions} onValueChange={(value) => updateInterviewForm({ accessibilityCheckStatus: value as RecruitingAccessibilityCheckStatus })} />
                  <CheckboxField label="SBV eingeladen" checked={interviewForm.sbvInvited} onCheckedChange={(checked) => updateInterviewForm({ sbvInvited: checked })} />
                  <CheckboxField label="SBV teilgenommen" checked={interviewForm.sbvAttended} onCheckedChange={(checked) => updateInterviewForm({ sbvAttended: checked })} />
                  <CheckboxField label="Nachhaltung erforderlich" checked={interviewForm.followUpNeeded} onCheckedChange={(checked) => updateInterviewForm({ followUpNeeded: checked })} />
                  <TextareaInput label="Verfahrensnotiz zum Ereignis" wide value={interviewForm.proceduralNote} onValueChange={(value) => updateInterviewForm({ proceduralNote: value })} helpText="Der Inhalt wird nicht in Audit-Diffs gespiegelt. Keine Gesprächsinhalte, Diagnosen oder Bewertungen erfassen." />
                </div>
                <div className="industrial-action-row mt-4">
                  <IndustrialButton loading={saving} onClick={() => void addInterview()}><BriefcaseBusiness className="h-4 w-4" /> Gespräch erfassen</IndustrialButton>
                </div>
              </FormSection>

              <FormSection kicker="Nachhaltung" title="Wiedervorlage bewusst anlegen" description="Fristen werden nicht still erzeugt. Lege sie nur an, wenn du Unterlagen, Anhörung oder Arbeitgeberentscheidung aktiv nachhalten willst.">
                <div className="industrial-form-grid">
                  <DateInput label="Wiedervorlage am" value={followUpDueAt} onValueChange={setFollowUpDueAt} />
                </div>
                <div className="industrial-action-row mt-4">
                  <IndustrialButton variant="secondary" onClick={() => void createRecruitingFollowUp('documents')}><CalendarClock className="h-4 w-4" /> Unterlagen nachhalten</IndustrialButton>
                  <IndustrialButton variant="secondary" onClick={() => void createRecruitingFollowUp('hearing')}><ClipboardList className="h-4 w-4" /> Anhörung nachhalten</IndustrialButton>
                  <IndustrialButton variant="danger" loading={saving} onClick={() => openParticipationViolationPrefill()}><AlertTriangle className="h-4 w-4" /> Beteiligungsverstoß prüfen</IndustrialButton>
                </div>
              </FormSection>

              <FormSection kicker="Ereignisse" title="Dokumentierte Vorstellungsgespräche">
                {interviews.length === 0 ? <div className="industrial-empty-state">Noch kein Vorstellungsgespräch erfasst.</div> : null}
                <div className="industrial-stack">
                  {interviews.map((interview) => (
                    <article key={interview.id} className="industrial-record-card industrial-tone-default">
                      <p className="industrial-kicker">{formatRecruitingDate(interview.interviewDate)} · {recruitingApplicantStatusLabels[interview.applicantStatus]}</p>
                      <strong>{interview.applicantRef}</strong>
                      <p>SBV eingeladen: {interview.sbvInvited ? 'ja' : 'nein'} · teilgenommen: {interview.sbvAttended ? 'ja' : 'nein'} · Barrierefreiheit: {recruitingAccessibilityStatusLabels[interview.accessibilityCheckStatus]}</p>
                      <div className="industrial-action-row">
                        <ActivityJournalContextButton
                          compact
                          context={{
                            contextType: 'recruiting_interview',
                            contextId: interview.id,
                            title: 'Vorstellungsgespräch: SBV-Teilnahme dokumentiert',
                            category: 'participation',
                          }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </FormSection>

              {riskHints.length > 0 ? (
                <section className="industrial-message industrial-message-warning" role="note" aria-label="Prüfhinweise zur Stellenbesetzung">
                  <strong>Prüfhinweise:</strong> {riskHints.join(' · ')}
                </section>
              ) : null}
            </>
          ) : null}
        </WorkbenchDetailPanel>
      </WorkbenchGrid>
    </ModuleFrame>
  );
}
