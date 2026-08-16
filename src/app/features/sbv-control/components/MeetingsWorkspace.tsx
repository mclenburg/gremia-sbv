import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
import { SearchInput } from '../../../shared/components/IndustrialForm';
import { IndustrialHelpButton } from '../../../shared/help/IndustrialHelp';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import type { ActivityJournalPrefill } from '../../../core/models/activity-journal.model';
import type { GremiaBrCachedOverview } from '../../../core/models/gremia-br.model';
import type {
  CreateSbvMeetingInput,
  SbvMeetingAgendaItemRecord,
  SbvMeetingRecord,
  SbvMeetingType,
  UpsertSbvMeetingAgendaInput,
} from '../../../core/models/sbv-office-workflow.model';
import { dispatchActivityJournalPrefill } from '../../activity-journal/activityJournalEvents';
import { SbvControlPanel } from './SbvControlPanel';

const meetingTypeLabels: Record<SbvMeetingType, string> = {
  works_council: 'Betriebsrat',
  council_committee: 'BR-Ausschuss',
  health_safety: 'Arbeitsschutzausschuss',
  employer_council_meeting: 'Arbeitgeber/BR-Besprechung',
  works_assembly: 'Betriebsversammlung',
  other: 'Sonstiges',
};
type JournalActivity = 'attendance' | 'preparation' | 'top_request' | 'suspension';

type BrMeetingDraft = {
  sourceId: string;
  title: string;
  startsAt: string;
  location?: string;
  agenda: string[];
};

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function brMeetingId(item: unknown): string | undefined {
  const record = toRecord(item);
  return record ? firstString(record, ['id', 'uuid', 'sitzungId']) : undefined;
}

function brMeetingTitle(item: unknown): string {
  const record = toRecord(item);
  return record ? firstString(record, ['titel', 'title', 'name']) ?? 'Betriebsratssitzung' : 'Betriebsratssitzung';
}

function brMeetingStartsAt(item: unknown): string | undefined {
  const record = toRecord(item);
  if (!record) return undefined;
  return firstString(record, ['startsAt', 'startAt', 'beginn', 'datum', 'date']);
}

function brMeetingLocation(item: unknown): string | undefined {
  const record = toRecord(item);
  return record ? firstString(record, ['ort', 'location', 'raum', 'room']) : undefined;
}

function brAgendaTitle(item: unknown): string | undefined {
  const record = toRecord(item);
  return record ? firstString(record, ['titel', 'title', 'name', 'bezeichnung', 'text']) : undefined;
}

export function buildBrMeetingDrafts(overview: GremiaBrCachedOverview | null): BrMeetingDraft[] {
  if (!overview) return [];
  const raw = [overview.currentMeeting, overview.nextMeeting, ...overview.upcomingMeetings].filter(Boolean);
  const seen = new Set<string>();
  const result: BrMeetingDraft[] = [];
  for (const item of raw) {
    const sourceId = brMeetingId(item);
    const startsAt = brMeetingStartsAt(item);
    if (!sourceId || !startsAt || seen.has(sourceId)) continue;
    seen.add(sourceId);
    result.push({
      sourceId,
      title: brMeetingTitle(item),
      startsAt,
      location: brMeetingLocation(item),
      agenda: (overview.meetingAgendas[sourceId] ?? []).map(brAgendaTitle).filter((title): title is string => Boolean(title)),
    });
  }
  return result.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

function toDateTimeLocal(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function GremiaBrMeetingImport({ onCreate, onAgenda, onSelectedMeeting }: {
  onCreate: (input: CreateSbvMeetingInput) => Promise<SbvMeetingRecord>;
  onAgenda: (id: string, input: UpsertSbvMeetingAgendaInput) => Promise<SbvMeetingAgendaItemRecord>;
  onSelectedMeeting: (id: string) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [overview, setOverview] = useState<GremiaBrCachedOverview | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const meetings = useMemo(() => buildBrMeetingDrafts(overview), [overview]);
  const selected = meetings.find((meeting) => meeting.sourceId === selectedId);

  useEffect(() => {
    let active = true;
    void (async () => {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr || !active) return;
      const settings = await bridge.gremiaBr.getSettings();
      if (!active) return;
      setEnabled(settings.enabled);
      if (settings.enabled) setOverview(await bridge.gremiaBr.getCachedOverview());
    })().catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Lesebrücke ist nicht verfügbar.');
      const result = await bridge.gremiaBr.refreshCache();
      setOverview(result.cached); setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gremia.BR-Daten konnten nicht aktualisiert werden.');
    } finally { setBusy(false); }
  }

  async function importMeeting() {
    if (!selected) return;
    setBusy(true); setMessage('');
    try {
      const created = await onCreate({ meetingType: 'works_council', title: selected.title, startsAt: new Date(selected.startsAt).toISOString(), location: selected.location, status: 'planned' });
      for (const [index, agendaTitle] of selected.agenda.entries()) {
        await onAgenda(created.id, { title: agendaTitle, position: index + 1, sbvRelevance: false, referenceScope: 'none', requestedBySbv: false, significantImpairment: false, nonParticipation: false });
      }
      onSelectedMeeting(created.id);
      setMessage(`Sitzung aus Gremia.BR übernommen${selected.agenda.length ? `, ${selected.agenda.length} TOP(s) angelegt` : ''}. SBV-Relevanz bitte selbst bewerten.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sitzung konnte nicht übernommen werden.');
    } finally { setBusy(false); }
  }

  if (!enabled) return null;
  return <section className="sbv-control-section sbv-meetings-bridge" aria-labelledby="gremia-br-meetings-heading">
    <div><p className="industrial-kicker">Gremia.BR</p><h3 id="gremia-br-meetings-heading">BR-Sitzung übernehmen</h3><p className="industrial-meta">Lesebrücke aktiv. Sitzung und Tagesordnung werden als eigene SBV-Arbeitskopie übernommen; SBV-Relevanz und Bewertungen bleiben bewusst manuell.</p></div>
    <div className="industrial-form-grid two-columns">
      <label className="industrial-field"><span>Gremia.BR-Sitzung</span><select className="industrial-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Auswählen …</option>{meetings.map((meeting) => <option key={meeting.sourceId} value={meeting.sourceId}>{new Date(meeting.startsAt).toLocaleString('de-DE')} · {meeting.title}</option>)}</select></label>
      <div className="industrial-action-row sbv-meetings-bridge-actions"><IndustrialButton variant="secondary" disabled={busy} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />{busy ? 'Abruf läuft …' : 'Daten aktualisieren'}</IndustrialButton><IndustrialButton disabled={!selected || busy} onClick={() => void importMeeting()}>In SBV-Sitzung übernehmen</IndustrialButton></div>
    </div>
    {message ? <div className="industrial-message industrial-message-info" role="status">{message}</div> : null}
  </section>;
}

export function filterMeetings(records: SbvMeetingRecord[], query: string): SbvMeetingRecord[] {
  const normalized = query.trim().toLocaleLowerCase('de-DE');
  const sorted = [...records].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  if (!normalized) return sorted;
  return sorted.filter((record) => {
    const searchable = [
      record.title,
      meetingTypeLabels[record.meetingType],
      record.location ?? '',
      record.status,
      new Date(record.startsAt).toLocaleDateString('de-DE'),
      new Date(record.startsAt).toLocaleString('de-DE'),
    ].join(' ').toLocaleLowerCase('de-DE');
    return searchable.includes(normalized);
  });
}

export function meetingPageCount(total: number, pageSize = 5): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageMeetings(records: SbvMeetingRecord[], page: number, pageSize = 5): SbvMeetingRecord[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return records.slice(start, start + pageSize);
}

export function MeetingsWorkspace({ records, onCreate, onAgenda, onAgendaFollowUp, onJournal }: {
  records: SbvMeetingRecord[];
  onCreate: (input: CreateSbvMeetingInput) => Promise<SbvMeetingRecord>;
  onAgenda: (id: string, input: UpsertSbvMeetingAgendaInput) => Promise<SbvMeetingAgendaItemRecord>;
  onAgendaFollowUp: (agendaId: string, dueAt: string) => Promise<void>;
  onJournal: (id: string, activity: JournalActivity) => Promise<ActivityJournalPrefill>;
}) {
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [type, setType] = useState<SbvMeetingType>('works_council');
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaRelevant, setNewAgendaRelevant] = useState(true);
  const [selectedAgendaId, setSelectedAgendaId] = useState('');
  const [meetingFilter, setMeetingFilter] = useState('');
  const [meetingPage, setMeetingPage] = useState(1);
  const meetingPageSize = 5;
  const filteredMeetings = useMemo(() => filterMeetings(records, meetingFilter), [records, meetingFilter]);
  const pageCount = meetingPageCount(filteredMeetings.length, meetingPageSize);
  const normalizedPage = Math.min(meetingPage, pageCount);
  const visibleMeetings = pageMeetings(filteredMeetings, normalizedPage, meetingPageSize);

  const current = records.find((record) => record.id === selectedMeetingId);
  const agenda = current?.agenda.find((item) => item.id === selectedAgendaId);

  useEffect(() => {
    if (meetingPage !== normalizedPage) setMeetingPage(normalizedPage);
  }, [meetingPage, normalizedPage]);

  async function journal(activity: JournalActivity) {
    if (!current) return;
    dispatchActivityJournalPrefill(await onJournal(current.id, activity), true);
  }

  return (
    <SbvControlPanel
      kicker="Gremien"
      title="Sitzungen & Tagesordnung"
      actions={<IndustrialHelpButton helpId="sbvOffice.meetings" label="Hilfe zu Gremiensitzungen öffnen" />}
    >
      <GremiaBrMeetingImport
        onCreate={onCreate}
        onAgenda={onAgenda}
        onSelectedMeeting={(id) => { setSelectedMeetingId(id); setSelectedAgendaId(''); }}
      />

      <section className="sbv-control-section sbv-meetings-section" aria-labelledby="meeting-create-heading">
        <div className="sbv-control-section-heading"><h3 id="meeting-create-heading">Sitzung manuell anlegen</h3></div>
        <div className="industrial-form-grid sbv-meeting-create-grid">
          <label className="industrial-field"><span>Sitzungstyp</span><select className="industrial-select" value={type} onChange={(event) => setType(event.target.value as SbvMeetingType)}>{Object.entries(meetingTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="industrial-field"><span>Titel</span><input className="industrial-input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="industrial-field"><span>Datum / Zeit</span><input className="industrial-input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
        </div>
        <div className="industrial-action-row sbv-control-action-row"><IndustrialButton onClick={async () => { const created = await onCreate({ meetingType: type, title, startsAt: fromDateTimeLocal(startsAt) ?? startsAt }); setSelectedMeetingId(created.id); setTitle(''); setStartsAt(''); setMeetingFilter(''); setMeetingPage(1); }} disabled={!title.trim() || !startsAt}>Sitzung anlegen</IndustrialButton></div>
      </section>

      <section className="sbv-control-section sbv-meetings-section" aria-labelledby="meeting-register-heading">
        <div className="sbv-control-section-heading"><h3 id="meeting-register-heading">Sitzungen</h3><p>Nach Datum absteigend. Sitzung auswählen, um Tagesordnung und SBV-Eigenaufzeichnung zu bearbeiten.</p></div>
        <div className="sbv-meeting-register-toolbar">
          <SearchInput label="Sitzungen filtern" value={meetingFilter} onValueChange={(value) => { setMeetingFilter(value); setMeetingPage(1); }} placeholder="Titel, Typ, Datum, Ort oder Status …" />
          <strong>{filteredMeetings.length} Sitzung{filteredMeetings.length === 1 ? '' : 'en'}</strong>
        </div>
        <div className="industrial-table-wrap">
          <table className="industrial-table sbv-meeting-register-table">
            <thead><tr><th>Datum / Zeit</th><th>Sitzungstyp</th><th>Titel</th><th>TOPs</th><th>Status</th></tr></thead>
            <tbody>{visibleMeetings.map((record) => <tr key={record.id} className={record.id === selectedMeetingId ? 'selected' : ''} tabIndex={0} aria-label={`Sitzung ${record.title} auswählen`} onClick={() => { setSelectedMeetingId(record.id); setSelectedAgendaId(''); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedMeetingId(record.id); setSelectedAgendaId(''); } }}><td>{new Date(record.startsAt).toLocaleString('de-DE')}</td><td>{meetingTypeLabels[record.meetingType]}</td><td><strong>{record.title}</strong></td><td>{record.agenda.length}</td><td>{record.status}</td></tr>)}</tbody>
          </table>
          {!visibleMeetings.length ? <div className="industrial-message industrial-message-info">Keine Sitzungen für den aktuellen Filter.</div> : null}
        </div>
        <div className="case-pagination sbv-meeting-pagination" aria-label="Sitzungslisten-Seiten">
          <span>Seite {normalizedPage} von {pageCount} · maximal {meetingPageSize} Sitzungen pro Seite</span>
          <button type="button" className="industrial-secondary-button compact" disabled={normalizedPage <= 1} onClick={() => setMeetingPage(normalizedPage - 1)}>Zurück</button>
          <button type="button" className="industrial-secondary-button compact" disabled={normalizedPage >= pageCount} onClick={() => setMeetingPage(normalizedPage + 1)}>Weiter</button>
        </div>
      </section>

      {current ? <section className="sbv-control-section sbv-meetings-section sbv-meeting-editor" aria-labelledby="meeting-editor-heading">
        <div className="sbv-meeting-editor-header">
          <div><p className="industrial-kicker">Sitzung bearbeiten</p><h3 id="meeting-editor-heading">{current.title}</h3><p className="industrial-meta">{new Date(current.startsAt).toLocaleString('de-DE')} · {meetingTypeLabels[current.meetingType]}</p></div>
          <div className="industrial-action-row sbv-meeting-journal-actions" aria-label="Tätigkeitsjournal"><IndustrialButton variant="secondary" onClick={() => journal('preparation')}>Vorbereitung ins Journal</IndustrialButton><IndustrialButton variant="secondary" onClick={() => journal('attendance')}>Teilnahme ins Journal</IndustrialButton></div>
        </div>
        <div className="industrial-table-wrap"><table className="industrial-table"><thead><tr><th>Pos.</th><th>TOP</th><th>SBV</th><th>Aussetzung</th></tr></thead><tbody>{current.agenda.map((item) => <tr key={item.id}><td>{item.position}</td><td><button type="button" className="industrial-link-button" onClick={() => setSelectedAgendaId(item.id)}>{item.title}</button></td><td>{item.sbvRelevance ? 'relevant' : '—'}</td><td>{item.suspensionDueAt ? new Date(item.suspensionDueAt).toLocaleString('de-DE') : '—'}</td></tr>)}</tbody></table></div>
        <div className="industrial-form-grid sbv-meeting-new-agenda-grid">
          <label className="industrial-field"><span>Neuer Tagesordnungspunkt</span><input className="industrial-input" value={newAgendaTitle} onChange={(event) => setNewAgendaTitle(event.target.value)} /></label>
          <label className="industrial-checkbox"><input type="checkbox" checked={newAgendaRelevant} onChange={(event) => setNewAgendaRelevant(event.target.checked)} /><span>SBV-relevant</span></label>
        </div>
        <div className="industrial-action-row sbv-control-action-row"><IndustrialButton onClick={async () => { const createdAgenda = await onAgenda(current.id, { title: newAgendaTitle, sbvRelevance: newAgendaRelevant, referenceScope: 'none', requestedBySbv: false, significantImpairment: false, nonParticipation: false }); setNewAgendaTitle(''); setSelectedAgendaId(createdAgenda.id); }} disabled={!newAgendaTitle.trim()}>TOP hinzufügen</IndustrialButton></div>
        {agenda ? <AgendaEditor meetingId={current.id} agenda={agenda} onAgenda={onAgenda} onAgendaFollowUp={onAgendaFollowUp} onJournal={journal} /> : null}
      </section> : null}
    </SbvControlPanel>
  );
}

function AgendaEditor({ meetingId, agenda, onAgenda, onAgendaFollowUp, onJournal }: {
  meetingId: string;
  agenda: SbvMeetingAgendaItemRecord;
  onAgenda: (id: string, input: UpsertSbvMeetingAgendaInput) => Promise<SbvMeetingAgendaItemRecord>;
  onAgendaFollowUp: (agendaId: string, dueAt: string) => Promise<void>;
  onJournal: (activity: JournalActivity) => Promise<void>;
}) {
  const [position, setPosition] = useState(String(agenda.position));
  const [referenceScope, setReferenceScope] = useState(agenda.referenceScope ?? 'none');
  const [documentsStatus, setDocumentsStatus] = useState(agenda.documentsStatus ?? '');
  const [ownPosition, setOwnPosition] = useState(agenda.ownPosition ?? '');
  const [requestContent, setRequestContent] = useState(agenda.requestContent ?? '');
  const [requestReaction, setRequestReaction] = useState(agenda.requestReaction ?? '');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [resolutionAt, setResolutionAt] = useState(toDateTimeLocal(agenda.resolutionAt));
  const [resolutionSummary, setResolutionSummary] = useState(agenda.resolutionSummary ?? '');
  const [impairmentAssessment, setImpairmentAssessment] = useState(agenda.impairmentAssessment ?? '');
  const [significantImpairment, setSignificantImpairment] = useState(agenda.significantImpairment);
  const [nonParticipation, setNonParticipation] = useState(agenda.nonParticipation);

  useEffect(() => {
    setPosition(String(agenda.position)); setReferenceScope(agenda.referenceScope ?? 'none'); setDocumentsStatus(agenda.documentsStatus ?? ''); setOwnPosition(agenda.ownPosition ?? '');
    setRequestContent(agenda.requestContent ?? ''); setRequestReaction(agenda.requestReaction ?? ''); setResolutionAt(toDateTimeLocal(agenda.resolutionAt)); setResolutionSummary(agenda.resolutionSummary ?? '');
    setImpairmentAssessment(agenda.impairmentAssessment ?? ''); setSignificantImpairment(agenda.significantImpairment); setNonParticipation(agenda.nonParticipation); setFollowUpDueAt('');
  }, [agenda]);

  const commonInput = (): UpsertSbvMeetingAgendaInput => ({
    ...agenda,
    title: agenda.title,
    position: Math.max(1, Number(position) || agenda.position),
    referenceScope,
    documentsStatus,
    ownPosition,
    requestContent,
    requestReaction,
    resolutionAt: fromDateTimeLocal(resolutionAt),
    resolutionSummary,
    impairmentAssessment,
    significantImpairment,
    nonParticipation,
  });
  const suspensionAvailable = Boolean(resolutionAt && (significantImpairment || nonParticipation));

  return <fieldset className="industrial-subsection" aria-labelledby={`agenda-${agenda.id}-legend`}>
    <legend id={`agenda-${agenda.id}-legend`}>TOP bearbeiten: {agenda.title}</legend>
    <div className="industrial-form-grid">
      <label><span>Position</span><input className="industrial-input" type="number" min="1" value={position} onChange={(event) => setPosition(event.target.value)} /></label>
      <label><span>Bezug</span><select className="industrial-select" value={referenceScope} onChange={(event) => setReferenceScope(event.target.value)}><option value="none">ohne Personenbezug</option><option value="individual">Einzelbezug</option><option value="group">Gruppenbezug</option></select></label>
      <label><span>Unterlagenstatus</span><input className="industrial-input" value={documentsStatus} onChange={(event) => setDocumentsStatus(event.target.value)} /></label>
    </div>
    <label><span>Eigene SBV-Position</span><textarea className="industrial-textarea" value={ownPosition} onChange={(event) => setOwnPosition(event.target.value)} /></label>
    <IndustrialButton variant="secondary" onClick={() => onAgenda(meetingId, commonInput())}>TOP-Daten speichern</IndustrialButton>

    <div className="industrial-form-grid two-columns">
      <label><span>TOP-Antrag / Inhalt</span><textarea className="industrial-textarea" value={requestContent} onChange={(event) => setRequestContent(event.target.value)} /></label>
      <label><span>Reaktion</span><textarea className="industrial-textarea" value={requestReaction} onChange={(event) => setRequestReaction(event.target.value)} /></label>
    </div>
    <div className="industrial-toolbar">
      <IndustrialButton variant="secondary" onClick={async () => { await onAgenda(meetingId, { ...commonInput(), requestedBySbv: true, requestAt: agenda.requestAt ?? new Date().toISOString(), requestContent: requestContent || agenda.title }); await onJournal('top_request'); }}>TOP-Antrag dokumentieren</IndustrialButton>
    </div>
    <div className="industrial-form-grid"><label><span>Wiedervorlage TOP-Antrag</span><input className="industrial-input" type="date" value={followUpDueAt} onChange={(event) => setFollowUpDueAt(event.target.value)} /></label><IndustrialButton variant="secondary" disabled={!followUpDueAt} onClick={() => onAgendaFollowUp(agenda.id, followUpDueAt)}>Wiedervorlage anlegen</IndustrialButton></div>

    <div className="industrial-form-grid">
      <label><span>Beschlussdatum / Zeit</span><input className="industrial-input" type="datetime-local" value={resolutionAt} onChange={(event) => setResolutionAt(event.target.value)} /></label>
      <label className="industrial-checkbox"><input type="checkbox" checked={significantImpairment} onChange={(event) => setSignificantImpairment(event.target.checked)} /><span>erhebliche Beeinträchtigung wichtiger Interessen</span></label>
      <label className="industrial-checkbox"><input type="checkbox" checked={nonParticipation} onChange={(event) => setNonParticipation(event.target.checked)} /><span>Nichtbeteiligung der SBV</span></label>
    </div>
    <label><span>Beschlussergebnis – SBV-Eigenaufzeichnung</span><textarea className="industrial-textarea" value={resolutionSummary} onChange={(event) => setResolutionSummary(event.target.value)} /></label>
    <label><span>Beeinträchtigungsbewertung</span><textarea className="industrial-textarea" value={impairmentAssessment} onChange={(event) => setImpairmentAssessment(event.target.value)} /></label>
    <div className="industrial-toolbar">
      <IndustrialButton variant="secondary" onClick={() => onAgenda(meetingId, commonInput())}>Beschlussbeobachtung speichern</IndustrialButton>
      <IndustrialButton variant="secondary" disabled={!suspensionAvailable || Boolean(agenda.suspensionRequestedAt)} onClick={async () => { await onAgenda(meetingId, { ...commonInput(), suspensionRequestedAt: new Date().toISOString() }); await onJournal('suspension'); }}>Aussetzung dokumentieren</IndustrialButton>
    </div>
    {agenda.suspensionDueAt ? <div className="industrial-message industrial-message-warning" role="status">Aussetzungsfrist: {new Date(agenda.suspensionDueAt).toLocaleString('de-DE')}</div> : null}
  </fieldset>;
}
