import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, FileText, Link2, Lock, Search, ShieldAlert, UserPlus } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { ContactRecord } from '../../core/models/contact.model';
import {
  LEGAL_NORM_SUGGESTIONS,
  formatAnonymizationMarkerText,
  formatCaseReferenceText,
  formatConfidentialityText,
  formatContactReferenceText,
  formatLegalNormText,
  formatOpenTaskText,
  formatRiskText,
  type ConfidentialCommandLevel,
  type RiskLevelCommand,
  type TextCommandToken
} from '@services/textCommandPolicy';
import type { TextCommandTextareaChange, TextCommandTextareaReplacement } from './TextCommandTextarea';

type GlobalDraft = TextCommandTextareaChange & {
  fieldId: string;
  query: string;
  title: string;
  dueAt: string;
  severity: 'normal' | 'important' | 'critical' | 'fatal';
  riskLevel: RiskLevelCommand;
  confidentiality: ConfidentialCommandLevel;
  label: string;
};

function initialDraft(detail: TextCommandTextareaChange): GlobalDraft | null {
  if (!detail.fieldId) return null;
  return {
    ...detail,
    fieldId: detail.fieldId,
    query: '',
    title: '',
    dueAt: '',
    severity: 'important',
    riskLevel: 'high',
    confidentiality: 'hoch_sensibel',
    label: 'Name'
  };
}

function emitReplacement(draft: GlobalDraft, replacement: string) {
  const detail: TextCommandTextareaReplacement = {
    fieldId: draft.fieldId,
    markerIndex: draft.index,
    token: draft.token,
    replacement
  };
  window.dispatchEvent(new CustomEvent<TextCommandTextareaReplacement>('gremia-sbv:text-command-replace', { detail }));
}

function formatDate(value: string): string {
  if (!value) return 'offen';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function GlobalTextCommandController({ cases, contacts }: { cases: CaseRecord[]; contacts: ContactRecord[] }) {
  const [draft, setDraft] = useState<GlobalDraft | null>(null);

  useEffect(() => {
    function handleTextCommand(event: Event) {
      const next = initialDraft((event as CustomEvent<TextCommandTextareaChange>).detail);
      if (!next) return;
      setDraft((current) => current ?? next);
    }

    window.addEventListener('gremia-sbv:text-command-detected', handleTextCommand);
    return () => window.removeEventListener('gremia-sbv:text-command-detected', handleTextCommand);
  }, []);

  const matchingCases = useMemo(() => {
    if (!draft || draft.token !== '##') return [];
    const query = draft.query.trim().toLowerCase();
    return cases
      .filter((item) => !query || `${item.caseNumber} ${item.displayName} ${item.summary ?? ''} ${item.category}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [cases, draft]);

  const matchingContacts = useMemo(() => {
    if (!draft || draft.token !== '@@') return [];
    const query = draft.query.trim().toLowerCase();
    return contacts
      .filter((item) => !query || `${item.firstName} ${item.lastName} ${item.organization ?? ''} ${item.role ?? ''} ${item.email ?? ''}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [contacts, draft]);

  const matchingNorms = useMemo(() => {
    if (!draft || draft.token !== '§§') return [];
    const query = draft.query.trim().toLowerCase();
    return LEGAL_NORM_SUGGESTIONS
      .filter((item) => !query || `${item.paragraph} ${item.title} ${item.shortText} ${item.source}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [draft]);

  if (!draft) return null;

  function closeWithoutReplacement() {
    setDraft(null);
  }

  function replaceAndClose(replacement: string) {
    if (!draft) return;
    emitReplacement(draft, replacement);
    setDraft(null);
  }

  const titleByToken: Record<TextCommandToken, string> = {
    '//': 'Frist einfügen',
    '@@': 'Kontakt einfügen',
    '##': 'Fallbezug einfügen',
    '§§': 'Rechtsnorm einfügen',
    '!!': 'Risiko markieren',
    '>>': 'Aufgabe einfügen',
    '^^': 'Vertraulichkeit einfügen',
    '~~': 'Anonymisierung vormerken'
  };

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="global-text-command-title">
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><Search className="h-5 w-5" /></div>
          <div>
            <p className="industrial-kicker">Inline-Befehl</p>
            <h2 id="global-text-command-title">{titleByToken[draft.token]}</h2>
            <p>Dieser Befehl wirkt direkt auf das aktuell bearbeitete Textfeld.</p>
          </div>
        </div>

        {draft.token === '//' && (
          <div className="industrial-modal-grid">
            <label><span>Titel</span><input value={draft.title} onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)} autoFocus placeholder="z. B. Rückmeldung Arbeitgeber nachhalten" /></label>
            <label><span>Datum</span><input type="datetime-local" value={draft.dueAt} onChange={(event) => setDraft((current) => current ? { ...current, dueAt: event.target.value } : current)} /></label>
            <div className="industrial-modal-preview"><CalendarPlus className="h-4 w-4" /> Wird eingefügt: <strong>{`Frist bis ${formatDate(draft.dueAt)}: ${draft.title.trim() || 'Wiedervorlage'}`}</strong></div>
          </div>
        )}

        {draft.token === '@@' && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide"><span>Kontakt suchen</span><input value={draft.query} onChange={(event) => setDraft((current) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="Name, Organisation, Rolle …" /></label>
            <div className="industrial-command-results">
              {matchingContacts.map((contact) => (
                <button key={contact.id} type="button" onClick={() => replaceAndClose(formatContactReferenceText(contact))}>
                  <UserPlus className="h-4 w-4" />
                  {formatContactReferenceText(contact)}
                </button>
              ))}
              {!matchingContacts.length && <p>Kein passender Kontakt gefunden.</p>}
            </div>
          </div>
        )}

        {draft.token === '##' && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide"><span>Fall suchen</span><input value={draft.query} onChange={(event) => setDraft((current) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="Aktenzeichen, Name, Kurzbeschreibung …" /></label>
            <div className="industrial-command-results">
              {matchingCases.map((item) => (
                <button key={item.id} type="button" onClick={() => replaceAndClose(formatCaseReferenceText(item.caseNumber, item.displayName))}>
                  <Link2 className="h-4 w-4" />
                  {item.caseNumber} · {item.displayName}
                </button>
              ))}
              {!matchingCases.length && <p>Kein passender Fall gefunden.</p>}
            </div>
          </div>
        )}

        {draft.token === '§§' && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide"><span>Norm suchen</span><input value={draft.query} onChange={(event) => setDraft((current) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="z. B. 167, BEM, Kündigung, AGG …" /></label>
            <div className="industrial-command-results">
              {matchingNorms.map((norm) => (
                <button key={norm.id} type="button" onClick={() => replaceAndClose(formatLegalNormText(norm))}>
                  <FileText className="h-4 w-4" />
                  {norm.paragraph} · {norm.title}
                </button>
              ))}
              {!matchingNorms.length && <p>Keine passende Norm gefunden.</p>}
            </div>
          </div>
        )}

        {draft.token === '!!' && (
          <div className="industrial-modal-grid">
            <label><span>Risikostufe</span><select value={draft.riskLevel} onChange={(event) => setDraft((current) => current ? { ...current, riskLevel: event.target.value as RiskLevelCommand } : current)}><option value="low">niedrig</option><option value="medium">mittel</option><option value="high">hoch</option><option value="critical">kritisch</option></select></label>
            <label className="industrial-modal-wide"><span>Hinweis</span><input value={draft.title} onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)} autoFocus placeholder="z. B. Kündigungsrisiko, Chronifizierung, Blockade …" /></label>
          </div>
        )}

        {draft.token === '>>' && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide"><span>Aufgabe</span><input value={draft.title} onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)} autoFocus placeholder="z. B. Inklusionsamt nachfassen" /></label>
          </div>
        )}

        {draft.token === '^^' && (
          <div className="industrial-modal-grid">
            <label><span>Stufe</span><select value={draft.confidentiality} onChange={(event) => setDraft((current) => current ? { ...current, confidentiality: event.target.value as ConfidentialCommandLevel } : current)}><option value="normal">normal</option><option value="sensibel">sensibel</option><option value="hoch_sensibel">hoch sensibel</option></select></label>
            <div className="industrial-modal-preview"><Lock className="h-4 w-4" /> Wird eingefügt: <strong>{formatConfidentialityText(draft.confidentiality)}</strong></div>
          </div>
        )}

        {draft.token === '~~' && (
          <div className="industrial-modal-grid">
            <label className="industrial-modal-wide"><span>Art der Textstelle</span><input value={draft.label} onChange={(event) => setDraft((current) => current ? { ...current, label: event.target.value } : current)} autoFocus placeholder="z. B. Name, Bereich, Gesundheitsdetail" /></label>
            <div className="industrial-modal-preview"><ShieldAlert className="h-4 w-4" /> Wird eingefügt: <strong>{formatAnonymizationMarkerText(draft.label)}</strong></div>
          </div>
        )}

        <div className="industrial-modal-actions">
          <button type="button" className="industrial-secondary-button" onClick={closeWithoutReplacement}>Abbrechen</button>
          {draft.token === '//' && <button type="button" className="industrial-button" onClick={() => replaceAndClose(`Frist bis ${formatDate(draft.dueAt)}: ${draft.title.trim() || 'Wiedervorlage'}`)}>Einfügen</button>}
          {draft.token === '!!' && <button type="button" className="industrial-button" onClick={() => replaceAndClose(formatRiskText(draft.riskLevel, draft.title))}>Einfügen</button>}
          {draft.token === '>>' && <button type="button" className="industrial-button" onClick={() => replaceAndClose(formatOpenTaskText(draft.title))}>Einfügen</button>}
          {draft.token === '^^' && <button type="button" className="industrial-button" onClick={() => replaceAndClose(formatConfidentialityText(draft.confidentiality))}>Einfügen</button>}
          {draft.token === '~~' && <button type="button" className="industrial-button" onClick={() => replaceAndClose(formatAnonymizationMarkerText(draft.label))}>Einfügen</button>}
        </div>
      </section>
    </div>
  );
}
