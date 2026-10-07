import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RecruitingInterviewEventRecord, RecruitingParticipationRecord } from '../../../domain/models/recruiting-participation.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { filterRecruitingRecords, getRecruitingRiskHints, type RecruitingListStatusFilter } from './recruitingViewLogic';
import { type ParticipationFormState, type InterviewFormState, emptyParticipationForm, emptyInterviewForm, formFromRecord } from './recruitingParticipationViewSupport';

export function useRecruitingParticipationState(targetId?: string, onTargetConsumed?: () => void) {
  const initialTargetId = useRef(targetId).current;
  const [records, setRecords] = useState<RecruitingParticipationRecord[]>([]);
  const [interviews, setInterviews] = useState<RecruitingInterviewEventRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ParticipationFormState>(() => emptyParticipationForm());
  const [interviewForm, setInterviewForm] = useState<InterviewFormState>(() => emptyInterviewForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecruitingListStatusFilter>('all');
  const creatingRef = useRef(false);
  const announce = useAnnouncer();

  const filteredRecords = useMemo(() => filterRecruitingRecords(records, query, statusFilter), [records, query, statusFilter]);
  const selected = useMemo(() => filteredRecords.find((record) => record.id === selectedId) ?? null, [filteredRecords, selectedId]);
  const riskHints = selected ? getRecruitingRiskHints(selected) : [];

  const reload = useCallback(async (preferredId?: string | null) => {
    setLoading(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.recruitingParticipations) throw new Error('Stellenbesetzungsdienst ist nicht erreichbar.');
      const rows = await bridge.recruitingParticipations.list();
      setRecords(rows);
      if (preferredId === undefined && creatingRef.current) { setSelectedId(null); setInterviews([]); return; }
      const nextId = preferredId === undefined ? rows[0]?.id ?? null : preferredId;
      const resolvedId = nextId && rows.some((row) => row.id === nextId) ? nextId : preferredId ? null : rows[0]?.id ?? null;
      if (preferredId && !resolvedId) setError('Die Stellenbesetzung zur Frist ist nicht mehr vorhanden.');
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
  }, []);

  useEffect(() => {
    void reload(initialTargetId);
  }, [reload, initialTargetId]);

  useEffect(() => {
    if (!targetId || loading) return;
    if (selectedId === targetId) document.querySelector<HTMLElement>('.workbench-detail-panel')?.focus();
    if (selectedId === targetId || error) onTargetConsumed?.();
  }, [targetId, selectedId, loading, error, onTargetConsumed]);

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  function updateForm(patch: Partial<ParticipationFormState>) { setForm((current) => ({ ...current, ...patch })); }

  function updateInterviewForm(patch: Partial<InterviewFormState>) { setInterviewForm((current) => ({ ...current, ...patch })); }

  async function selectRecord(id: string) {
    creatingRef.current = false;
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

  const stats = useMemo(() => ({
    open: records.filter((record) => record.status !== 'closed').length,
    hearingOpen: records.filter((record) => record.hasSeverelyDisabledApplicants && !record.statementSubmittedDate && !record.decisionKnownDate).length,
    documentsOpen: records.filter((record) => record.hasSeverelyDisabledApplicants && !record.documentsComplete).length,
    review: records.filter((record) => record.flaggedForViolationReview).length,
  }), [records]);

  return {
    records, interviews, selected, form, interviewForm, loading, saving, error, message, createOpen,
    query, statusFilter, filteredRecords, riskHints, stats, creatingRef, announce, reload, selectRecord,
    setSelectedId, setForm, setInterviewForm, setInterviews, setSaving, setError, setMessage,
    setCreateOpen, setQuery, setStatusFilter, updateForm, updateInterviewForm,
  };
}
