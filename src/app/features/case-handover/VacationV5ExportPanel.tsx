import { useState, type FormEvent } from 'react';
import type { VacationV5ExportPreview, VacationV5ExportResult,
  VacationV5ScopeCandidate, VacationV5SelectionRequest } from '../../../domain/transfer/vacationV5File';
import type { VacationV5ScopeSelection } from '../../../domain/transfer/vacationV5ScopePolicy';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { ExportAction, FileLocationNotice } from '../../shared/components/ImportExportFeedback';
import { FormActions, TextareaInput } from '../../shared/components/IndustrialForm';
import { requireCaseHandoverBridge } from './caseHandoverBridge';
import { VacationV5ScopePicker } from './VacationV5ScopePicker';

const EMPTY: VacationV5ScopeSelection = { caseIds: [], standaloneDeadlineIds: [], meetingIds: [],
  recruitingIds: [], employerObligationIds: [], inclusionAgreementIds: [], violationIds: [], assemblyIds: [] };
const SECTION_LABELS: Record<string, string> = {
  case: 'Fallakten', case_note: 'Fallnotizen', case_measure: 'Maßnahmen',
  case_measure_note: 'Maßnahmennotizen', case_deadline: 'Fallfristen', case_document: 'Falldokumente',
  deadline: 'Fallfreie Fristen', meeting: 'Sitzungen', meeting_agenda: 'Tagesordnungspunkte',
  recruiting: 'Stellenbesetzungen', recruiting_interview: 'Gespräche',
  employer_obligation: 'Arbeitgeberpflichten', inclusion_agreement: 'Inklusionsvereinbarungen',
  inclusion_topic: 'Vereinbarungsthemen', violation: 'Beteiligungsverstöße',
  violation_event: 'Verstoßereignisse', assembly: 'SBV-Versammlungen',
  inclusion_officer: 'Inklusionsbeauftragter', generated_document: 'Amtsdokumente',
  workflow_document_link: 'Dokumentzuordnungen', violation_document_link: 'Verstoßdokumentzuordnungen',
};

function hasSelection(selection: VacationV5ScopeSelection): boolean {
  return Boolean(selection.inclusionOfficerSnapshotId)
    || Object.values(selection).some((value) => Array.isArray(value) && value.length > 0);
}

function isSelected(selection: VacationV5ScopeSelection, candidate: VacationV5ScopeCandidate): boolean {
  return candidate.scopeKey === 'inclusionOfficerSnapshotId'
    ? selection.inclusionOfficerSnapshotId === candidate.id
    : selection[candidate.scopeKey].includes(candidate.id);
}

function selectionRequest(candidates: VacationV5ScopeCandidate[], selection: VacationV5ScopeSelection,
  documentIds: readonly string[], handoverNote: string): VacationV5SelectionRequest {
  const selected = candidates.filter((candidate) => isSelected(selection, candidate));
  const documents = selected.flatMap((candidate) => candidate.documents
    .filter((document) => documentIds.includes(document.id)).map((document) => ({ ...document,
      isCase: candidate.scopeKey === 'caseIds' })));
  return { selection, handoverNote, documentIds: [...new Set(documents.filter((item) => item.isCase).map((item) => item.id))],
    officeDocumentIds: [...new Set(documents.filter((item) => !item.isCase).map((item) => item.id))] };
}

function recommendedSelection(candidates: VacationV5ScopeCandidate[]): VacationV5ScopeSelection {
  const next = { ...EMPTY };
  for (const candidate of candidates.filter((item) => item.recommended)) {
    if (candidate.scopeKey === 'inclusionOfficerSnapshotId') continue;
    next[candidate.scopeKey] = [...next[candidate.scopeKey], candidate.id];
    const parent = candidate.requiredParent;
    if (parent && parent.scopeKey !== 'inclusionOfficerSnapshotId'
      && candidates.some((item) => item.scopeKey === parent.scopeKey && item.id === parent.id)) {
      next[parent.scopeKey] = [...new Set([...next[parent.scopeKey], parent.id])];
    }
  }
  return next;
}

function toggleCandidateSelection(current: VacationV5ScopeSelection, candidate: VacationV5ScopeCandidate,
  candidates: VacationV5ScopeCandidate[]): VacationV5ScopeSelection {
  const wasSelected = isSelected(current, candidate);
  if (candidate.scopeKey === 'inclusionOfficerSnapshotId') return { ...current,
    inclusionOfficerSnapshotId: wasSelected ? undefined : candidate.id };
  const key = candidate.scopeKey;
  const next = { ...current, [key]: wasSelected
    ? current[key].filter((id) => id !== candidate.id) : [...current[key], candidate.id] };
  const parent = candidate.requiredParent;
  if (!wasSelected && parent && parent.scopeKey !== 'inclusionOfficerSnapshotId'
    && candidates.some((item) => item.scopeKey === parent.scopeKey && item.id === parent.id)) {
    next[parent.scopeKey] = [...new Set([...next[parent.scopeKey], parent.id])];
  }
  return next;
}

function VacationV5ExportPreviewPanel({ preview, confirmed, onConfirm }: {
  preview: VacationV5ExportPreview; confirmed: boolean; onConfirm: (value: boolean) => void;
}) {
  return <div className="industrial-selection-card" role="region" aria-label="Exportvorschau">
    <h3>Bestätigter Umfang</h3>
    <ul>{preview.sectionCounts.map((section) => <li key={section.type}>{SECTION_LABELS[section.type] ?? section.type}: {section.count}</li>)}</ul>
    <p>{preview.documents.length} Dokumente · {new Intl.NumberFormat('de-DE').format(preview.documentBytes)} Byte
      · {preview.sensitiveTextCount} Vorgänge mit Freitext oder Gesundheitsdaten.</p>
    {preview.documents.length ? <ul aria-label="Dokumente im Export">{preview.documents.map((document, index) =>
      <li key={`${document.filename}-${index}`}>{document.filename} · {document.owner} · {new Intl.NumberFormat('de-DE').format(document.sizeBytes)} Byte
        {document.containsHealthData ? ' · Gesundheitsdaten' : ''}</li>)}</ul> : null}
    <label className="industrial-checkbox-row"><input type="checkbox" className="industrial-input"
      checked={confirmed} onChange={(event) => onConfirm(event.currentTarget.checked)} />
      <span>Ich habe den Umfang, die Dokumente und das Vertretungsende geprüft.</span></label>
  </div>;
}

export function VacationV5ExportPanel({ onCompleted, profileId, expiresAt, passphrase }: {
  onCompleted: () => Promise<void>; profileId: string; expiresAt: string; passphrase: string;
}) {
  const announce = useAnnouncer();
  const [handoverNote, setHandoverNote] = useState('');
  const [candidates, setCandidates] = useState<VacationV5ScopeCandidate[]>([]);
  const [selection, setSelection] = useState<VacationV5ScopeSelection>(EMPTY);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<VacationV5ExportPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<VacationV5ExportResult | null>(null);
  function report(message: string, failed = false) {
    setError(failed ? message : ''); setStatus(failed ? '' : message);
    announce(message, failed ? 'assertive' : 'polite');
  }

  function invalidate() { setPreview(null); setConfirmed(false); setResult(null); }

  async function loadCandidates() {
    setBusy(true); invalidate(); setCandidates([]); setSelection(EMPTY); setDocumentIds([]);
    try {
      const bridge = await requireCaseHandoverBridge();
      const loaded = await bridge.listV5Candidates(expiresAt);
      setCandidates(loaded);
      report(`${loaded.length} offene Vorgänge geladen. Die Vorschläge werden erst nach Ihrer Auswahl übernommen.`);
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Vertretungsvorgänge konnten nicht geladen werden.', true); }
    finally { setBusy(false); }
  }

  function toggle(candidate: VacationV5ScopeCandidate) {
    const wasSelected = isSelected(selection, candidate);
    setSelection((current) => toggleCandidateSelection(current, candidate, candidates));
    if (wasSelected) setDocumentIds((current) => current.filter((id) => !candidate.documents.some((document) => document.id === id)));
    invalidate();
  }

  function chooseRecommended() {
    setSelection(recommendedSelection(candidates)); setDocumentIds([]); invalidate();
    report('Offene Vorgänge im Vertretungszeitraum ausgewählt. Bitte Umfang und Dokumente einzeln prüfen.');
  }

  async function makePreview() {
    if (!hasSelection(selection)) return report('Bitte mindestens einen Vorgang auswählen.', true);
    setBusy(true); invalidate();
    try {
      const bridge = await requireCaseHandoverBridge();
      const next = await bridge.previewV5Export(selectionRequest(candidates, selection, documentIds, handoverNote));
      setPreview(next);
      report('Umfang und Dokumente geprüft. Bitte die Vorschau vor dem Export bestätigen.');
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Exportvorschau konnte nicht erstellt werden.', true); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview || !confirmed || !profileId) return report('Bitte Zielprofil und Vorschau bestätigen.', true);
    if (passphrase.trim().length < 10) return report('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.', true);
    setBusy(true); setError(''); setStatus('');
    try {
      const bridge = await requireCaseHandoverBridge();
      const exported = await bridge.exportV5({ ...selectionRequest(candidates, selection, documentIds, handoverNote), profileId, expiresAt, passphrase,
        previewDigest: preview.digest }, 'urlaubsvertretung-format-5.gsbvtransfer');
      if (!exported.exported) return report('Dateiauswahl abgebrochen. Es wurde kein Paket gespeichert.');
      setResult(exported); setConfirmed(false);
      report('Erweiterte Urlaubsübergabe wurde verschlüsselt gespeichert.');
      try { await onCompleted(); }
      catch { report('Das Paket wurde gespeichert. Die Übersicht konnte nicht aktualisiert werden.', true); }
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Format-5-Export fehlgeschlagen. Bitte Vorschau erneuern.', true); }
    finally { setBusy(false); }
  }

  return <form className="industrial-stack" onSubmit={(event) => void submit(event)} aria-label="Format-5-Vertretung">
      <p className="industrial-meta">Wählen Sie die für die Vertretung nötigen Vorgänge und Dokumente. Ein Paket kann ohne Fallakte entstehen.</p>
      <div className="industrial-action-row"><ToolbarButton type="button" loading={busy} onClick={() => void loadCandidates()}>Offene Vorgänge laden</ToolbarButton>
        {candidates.length ? <ToolbarButton type="button" onClick={chooseRecommended}>Vorgeschlagene auswählen</ToolbarButton> : null}</div>
      {candidates.length ? <VacationV5ScopePicker candidates={candidates} selection={selection} documentIds={documentIds}
        onToggle={toggle} onToggleDocument={(id) => { setDocumentIds((current) => current.includes(id)
          ? current.filter((item) => item !== id) : [...current, id]); invalidate(); }} /> : null}
      {candidates.length ? <div className="industrial-action-row"><ToolbarButton type="button" loading={busy}
        onClick={() => void makePreview()}>Umfang prüfen</ToolbarButton></div> : null}
      <TextareaInput label="Kurzer Übergabehinweis (optional)" value={handoverNote} maxLength={2000}
        onValueChange={(value) => { setHandoverNote(value); invalidate(); }}
        helpText="Prioritäten und nächste Schritte für die Vertretung. Der Hinweis wird im Paket verschlüsselt." />
      {preview ? <VacationV5ExportPreviewPanel preview={preview} confirmed={confirmed} onConfirm={setConfirmed} /> : null}
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {status ? <div className="industrial-message industrial-message-success" role="status">{status}</div> : null}
      {result?.exported ? <FileLocationNotice filePath={result.filePath} label="Format-5-Paket gespeichert" /> : null}
      <FormActions><ExportAction type="submit" loading={busy} disabled={!preview || !confirmed || !profileId}>
        Geprüfte Vertretung exportieren</ExportAction></FormActions>
    </form>;
}
