import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  FolderKanban,
  Lock,
  Scale,
  ShieldAlert,
  Users
} from 'lucide-react';
import { filterContactsForQuery, formatContactReference } from '../../contacts/contactDisplay';
import {
  LEGAL_NORM_SUGGESTIONS,
  formatAnonymizationMarkerText,
  formatConfidentialityText,
  formatLegalNormText,
  formatOpenTaskText,
  formatRiskText
} from '@services/textCommandPolicy';
import { filterCasesForInlineCommand, filterNormsForInlineCommand } from './inlineCommandSearch';
import type { ContactCategory } from '../../../core/models/contact.model';
import type { DeadlineSeverity } from '../../../core/models/deadline.model';
import type { ConfidentialCommandLevel, RiskLevelCommand } from '@services/textCommandPolicy';

type Setter<T> = (value: T | ((current: T | null) => T | null)) => void;

export type InlineCommandOverlaysProps = {
  inlineCaseLinkDraft: any;
  setInlineCaseLinkDraft: Setter<any>;
  cases: any[];
  insertCaseReferenceFromProtocol: (record: any) => void | Promise<void>;
  cancelInlineCaseLinkDraft: () => void;

  inlineLegalNormDraft: any;
  setInlineLegalNormDraft: Setter<any>;
  insertLegalNormFromProtocol: (norm: any) => void | Promise<void>;
  cancelInlineLegalNormDraft: () => void;

  inlineRiskDraft: any;
  setInlineRiskDraft: Setter<any>;
  insertRiskFromProtocol: () => void | Promise<void>;
  cancelInlineRiskDraft: () => void;

  inlineOpenTaskDraft: any;
  setInlineOpenTaskDraft: Setter<any>;
  createOpenTaskFromProtocol: () => void | Promise<void>;
  cancelInlineOpenTaskDraft: () => void;

  inlineConfidentialityDraft: any;
  setInlineConfidentialityDraft: Setter<any>;
  applyConfidentialityFromProtocol: () => void;
  cancelInlineConfidentialityDraft: () => void;

  inlineAnonymizationDraft: any;
  setInlineAnonymizationDraft: Setter<any>;
  applyAnonymizationMarkerFromProtocol: () => void;
  cancelInlineAnonymizationDraft: () => void;

  inlineContactDraft: any;
  setInlineContactDraft: Setter<any>;
  contacts: any[];
  insertExistingContactFromProtocol: (contact: any) => void | Promise<void>;
  createAndInsertContactFromProtocol: () => void | Promise<void>;
  cancelInlineContactDraft: () => void;

  inlineDeadlineDraft: any;
  setInlineDeadlineDraft: Setter<any>;
  selectedCase: any;
  buildInlineDeadlineText: (draft: any) => string;
  createInlineDeadlineFromProtocol: () => void | Promise<void>;
  cancelInlineDeadlineDraft: () => void;
};

export function InlineCommandOverlays(props: InlineCommandOverlaysProps) {
  const {
    inlineCaseLinkDraft,
    setInlineCaseLinkDraft,
    cases,
    insertCaseReferenceFromProtocol,
    cancelInlineCaseLinkDraft,
    inlineLegalNormDraft,
    setInlineLegalNormDraft,
    insertLegalNormFromProtocol,
    cancelInlineLegalNormDraft,
    inlineRiskDraft,
    setInlineRiskDraft,
    insertRiskFromProtocol,
    cancelInlineRiskDraft,
    inlineOpenTaskDraft,
    setInlineOpenTaskDraft,
    createOpenTaskFromProtocol,
    cancelInlineOpenTaskDraft,
    inlineConfidentialityDraft,
    setInlineConfidentialityDraft,
    applyConfidentialityFromProtocol,
    cancelInlineConfidentialityDraft,
    inlineAnonymizationDraft,
    setInlineAnonymizationDraft,
    applyAnonymizationMarkerFromProtocol,
    cancelInlineAnonymizationDraft,
    inlineContactDraft,
    setInlineContactDraft,
    contacts,
    insertExistingContactFromProtocol,
    createAndInsertContactFromProtocol,
    cancelInlineContactDraft,
    inlineDeadlineDraft,
    setInlineDeadlineDraft,
    selectedCase,
    buildInlineDeadlineText,
    createInlineDeadlineFromProtocol,
    cancelInlineDeadlineDraft
  } = props;

  return (
    <>
      {inlineCaseLinkDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-case-link-title">
            <div className="industrial-modal-header"><div className="industrial-modal-icon"><FolderKanban className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Fallbezug</p><h2 id="inline-case-link-title">Fallbezug verknüpfen</h2><p>Der gewählte Fall wird in den Text eingefügt und als weiterer Fallbezug der Notiz gespeichert.</p></div></div>
            <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Fall suchen</span><input value={inlineCaseLinkDraft.query} onChange={(event) => setInlineCaseLinkDraft((current: any) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="Aktenzeichen, Name/Pseudonym, Kategorie …" /></label></div>
            <div className="inline-contact-results">
              {filterCasesForInlineCommand(cases, inlineCaseLinkDraft.query).map((record) => (
                <button key={record.id} type="button" className="inline-contact-result" onClick={() => void insertCaseReferenceFromProtocol(record)}><strong>{record.caseNumber}</strong><span>{record.displayName} · {record.category}</span></button>
              ))}
            </div>
            <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineCaseLinkDraft}>Abbrechen</button></div>
          </section>
        </div>
      )}

      {inlineLegalNormDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-legal-title">
            <div className="industrial-modal-header"><div className="industrial-modal-icon"><Scale className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Rechtsnorm</p><h2 id="inline-legal-title">Rechtsnorm einfügen</h2><p>Die Norm wird als Kurzverweis in den Text eingefügt. Das ist die Grundlage für die spätere Wissensdatenbank-Verknüpfung.</p></div></div>
            <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Norm suchen</span><input value={inlineLegalNormDraft.query} onChange={(event) => setInlineLegalNormDraft((current: any) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="z. B. 178, Prävention, Kündigung, AGG …" /></label></div>
            <div className="inline-contact-results">
              {filterNormsForInlineCommand(LEGAL_NORM_SUGGESTIONS, inlineLegalNormDraft.query).map((norm) => (
                <button key={norm.id} type="button" className="inline-contact-result" onClick={() => void insertLegalNormFromProtocol(norm)}><strong>{formatLegalNormText(norm)}</strong><span>{norm.shortText}</span></button>
              ))}
            </div>
            <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineLegalNormDraft}>Abbrechen</button></div>
          </section>
        </div>
      )}

      {inlineRiskDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-risk-title">
            <div className="industrial-modal-header"><div className="industrial-modal-icon"><AlertTriangle className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Risiko</p><h2 id="inline-risk-title">Risiko markieren</h2><p>Die Markierung bleibt im Protokoll sichtbar und hebt bei hohen Risiken die Vertraulichkeit der Notiz an.</p></div></div>
            <div className="industrial-modal-grid">
              <label><span>Risikostufe</span><select value={inlineRiskDraft.level} onChange={(event) => setInlineRiskDraft((current: any) => current ? { ...current, level: event.target.value as RiskLevelCommand } : current)}><option value="low">niedrig</option><option value="medium">mittel</option><option value="high">hoch</option><option value="critical">kritisch</option></select></label>
              <label className="industrial-modal-wide"><span>Hinweis</span><input value={inlineRiskDraft.text} onChange={(event) => setInlineRiskDraft((current: any) => current ? { ...current, text: event.target.value } : current)} autoFocus placeholder="z. B. Kündigungsrisiko, Chronifizierungsrisiko, Arbeitgeber blockiert …" /></label>
            </div>
            <div className="industrial-modal-preview">Wird eingefügt: <strong>{formatRiskText(inlineRiskDraft.level, inlineRiskDraft.text)}</strong></div>
            <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineRiskDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={() => void insertRiskFromProtocol()}>Risiko einfügen</button></div>
          </section>
        </div>
      )}

      {inlineOpenTaskDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-task-title">
            <div className="industrial-modal-header"><div className="industrial-modal-icon"><CheckCircle2 className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Aufgabe</p><h2 id="inline-task-title">Offene Aufgabe ohne Datum</h2><p>Erzeugt eine Wiedervorlage ohne konkretes Ablaufdatum und vermerkt den nächsten Schritt im Text.</p></div></div>
            <div className="industrial-modal-grid"><label><span>Aufgabe</span><input value={inlineOpenTaskDraft.title} onChange={(event) => setInlineOpenTaskDraft((current: any) => current ? { ...current, title: event.target.value } : current)} autoFocus placeholder="z. B. Inklusionsamt nachfassen" /></label><label><span>Stufe</span><select value={inlineOpenTaskDraft.severity} onChange={(event) => setInlineOpenTaskDraft((current: any) => current ? { ...current, severity: event.target.value as DeadlineSeverity } : current)}><option value="normal">normal</option><option value="important">wichtig</option><option value="critical">kritisch</option><option value="fatal">fatal</option></select></label><label className="industrial-modal-wide"><span>Notiz</span><input value={inlineOpenTaskDraft.description} onChange={(event) => setInlineOpenTaskDraft((current: any) => current ? { ...current, description: event.target.value } : current)} /></label></div>
            <div className="industrial-modal-preview">Wird eingefügt: <strong>{formatOpenTaskText(inlineOpenTaskDraft.title)}</strong></div>
            <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineOpenTaskDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={() => void createOpenTaskFromProtocol()}>Aufgabe anlegen</button></div>
          </section>
        </div>
      )}

      {inlineConfidentialityDraft && (
        <div className="industrial-modal-backdrop" role="presentation"><section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-conf-title"><div className="industrial-modal-header"><div className="industrial-modal-icon"><Lock className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Vertraulichkeit</p><h2 id="inline-conf-title">Vertraulichkeitsstufe anheben</h2><p>Setzt die Vertraulichkeitsstufe der gesamten Notiz direkt hoch.</p></div></div><div className="industrial-modal-grid"><label><span>Stufe</span><select value={inlineConfidentialityDraft.level} onChange={(event) => setInlineConfidentialityDraft((current: any) => current ? { ...current, level: event.target.value as ConfidentialCommandLevel } : current)}><option value="normal">normal</option><option value="sensibel">sensibel</option><option value="hoch_sensibel">hoch sensibel</option></select></label></div><div className="industrial-modal-preview">Wird eingefügt: <strong>{formatConfidentialityText(inlineConfidentialityDraft.level)}</strong></div><div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineConfidentialityDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={applyConfidentialityFromProtocol}>Übernehmen</button></div></section></div>
      )}

      {inlineAnonymizationDraft && (
        <div className="industrial-modal-backdrop" role="presentation"><section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-anon-title"><div className="industrial-modal-header"><div className="industrial-modal-icon"><ShieldAlert className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Anonymisierung</p><h2 id="inline-anon-title">Anonymisierung vormerken</h2><p>Setzt eine sichtbare Vormerkung im Protokoll. Berichtslogik kann diese Markierung später gezielt auswerten.</p></div></div><div className="industrial-modal-grid"><label><span>Art der Textstelle</span><input value={inlineAnonymizationDraft.label} onChange={(event) => setInlineAnonymizationDraft((current: any) => current ? { ...current, label: event.target.value } : current)} autoFocus placeholder="z. B. Name, Bereich, Funktion, Gesundheitsdetail" /></label></div><div className="industrial-modal-preview">Wird eingefügt: <strong>{formatAnonymizationMarkerText(inlineAnonymizationDraft.label)}</strong></div><div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineAnonymizationDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={applyAnonymizationMarkerFromProtocol}>Vormerken</button></div></section></div>
      )}

      {inlineContactDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-contact-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><Users className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Inline-Kontakt</p>
                <h2 id="inline-contact-title">Kontakt im Protokoll einfügen</h2>
                <p>Nach dem Einfügen steht im Text: Name, Vorname (Firma).</p>
              </div>
            </div>

            <div className="industrial-modal-grid">
              <label className="industrial-modal-wide">
                <span>Bestehenden Kontakt suchen</span>
                <input
                  value={inlineContactDraft.query}
                  onChange={(event) => setInlineContactDraft((current: any) => current ? { ...current, query: event.target.value } : current)}
                  placeholder="Name, Organisation, Rolle, E-Mail …"
                  autoFocus
                />
              </label>
            </div>

            <div className="inline-contact-results">
              {filterContactsForQuery(contacts, inlineContactDraft.query).map((contact) => (
                <button key={contact.id} type="button" className="inline-contact-result" onClick={() => void insertExistingContactFromProtocol(contact)}>
                  <strong>{formatContactReference(contact)}</strong>
                  <span>{[contact.role, contact.email, contact.phone].filter(Boolean).join(' · ') || 'Kontakt'}</span>
                </button>
              ))}
              {!filterContactsForQuery(contacts, inlineContactDraft.query).length && (
                <div className="industrial-empty compact">Kein bestehender Kontakt gefunden. Unten neu erfassen.</div>
              )}
            </div>

            <div className="industrial-modal-grid">
              <label><span>Vorname</span><input value={inlineContactDraft.firstName} onChange={(event) => setInlineContactDraft((current: any) => current ? { ...current, firstName: event.target.value } : current)} /></label>
              <label><span>Nachname</span><input value={inlineContactDraft.lastName} onChange={(event) => setInlineContactDraft((current: any) => current ? { ...current, lastName: event.target.value } : current)} /></label>
              <label><span>Firma / Stelle</span><input value={inlineContactDraft.organization} onChange={(event) => setInlineContactDraft((current: any) => current ? { ...current, organization: event.target.value } : current)} /></label>
              <label><span>Rolle</span><input value={inlineContactDraft.role} onChange={(event) => setInlineContactDraft((current: any) => current ? { ...current, role: event.target.value } : current)} placeholder="z. B. Personalleiter" /></label>
              <label><span>Kategorie</span><select value={inlineContactDraft.category} onChange={(event) => setInlineContactDraft((current: any) => current ? { ...current, category: event.target.value as ContactCategory } : current)}><option value="arbeitgeber">Arbeitgeber</option><option value="inklusionsamt">Inklusionsamt</option><option value="agentur_fuer_arbeit">Agentur für Arbeit</option><option value="betriebsarzt">Betriebsarzt</option><option value="betriebsrat">Betriebsrat</option><option value="beratung">Beratung</option><option value="intern">intern</option><option value="sonstiges">sonstiges</option></select></label>
              <label><span>E-Mail</span><input value={inlineContactDraft.email} onChange={(event) => setInlineContactDraft((current: any) => current ? { ...current, email: event.target.value } : current)} /></label>
              <label><span>Telefon</span><input value={inlineContactDraft.phone} onChange={(event) => setInlineContactDraft((current: any) => current ? { ...current, phone: event.target.value } : current)} /></label>
            </div>

            {(inlineContactDraft.firstName || inlineContactDraft.lastName) && (
              <div className="industrial-modal-preview">
                Wird im Protokoll eingefügt: <strong>{formatContactReference({ firstName: inlineContactDraft.firstName, lastName: inlineContactDraft.lastName, organization: inlineContactDraft.organization })}</strong>
              </div>
            )}

            <div className="industrial-modal-actions">
              <button type="button" className="industrial-secondary-button" onClick={cancelInlineContactDraft}>Abbrechen</button>
              <button type="button" className="industrial-button" onClick={() => void createAndInsertContactFromProtocol()}>
                <Users className="h-4 w-4" />Kontakt anlegen und einfügen
              </button>
            </div>
          </section>
        </div>
      )}

      {inlineDeadlineDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-deadline-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><CalendarPlus className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Inline-Frist</p>
                <h2 id="inline-deadline-title">Frist aus Protokoll anlegen</h2>
                <p>Die Frist wird mit dem aktuell ausgewählten Fall verbunden: {selectedCase?.caseNumber ?? '—'}</p>
              </div>
            </div>

            <div className="industrial-modal-grid">
              <label>
                <span>Fristtitel</span>
                <input
                  value={inlineDeadlineDraft.title}
                  onChange={(event) => setInlineDeadlineDraft((current: any) => current ? { ...current, title: event.target.value } : current)}
                  placeholder="z. B. Antwort Arbeitgeber nachhalten"
                  autoFocus
                />
              </label>
              <label>
                <span>Ablaufdatum</span>
                <input
                  type="datetime-local"
                  value={inlineDeadlineDraft.dueAt}
                  onChange={(event) => setInlineDeadlineDraft((current: any) => current ? { ...current, dueAt: event.target.value } : current)}
                />
              </label>
              <label>
                <span>Stufe</span>
                <select
                  value={inlineDeadlineDraft.severity}
                  onChange={(event) => setInlineDeadlineDraft((current: any) => current ? { ...current, severity: event.target.value as DeadlineSeverity } : current)}
                >
                  <option value="normal">normal</option>
                  <option value="important">wichtig</option>
                  <option value="critical">kritisch</option>
                  <option value="fatal">fatal</option>
                </select>
              </label>
              <label>
                <span>Rechtsbezug</span>
                <input
                  value={inlineDeadlineDraft.legalBasis}
                  onChange={(event) => setInlineDeadlineDraft((current: any) => current ? { ...current, legalBasis: event.target.value } : current)}
                  placeholder="optional"
                />
              </label>
              <label className="industrial-modal-wide">
                <span>Notiz zur Frist</span>
                <input
                  value={inlineDeadlineDraft.description}
                  onChange={(event) => setInlineDeadlineDraft((current: any) => current ? { ...current, description: event.target.value } : current)}
                />
              </label>
            </div>

            {inlineDeadlineDraft.dueAt && (
              <div className="industrial-modal-preview">
                Wird im Protokoll eingefügt: <strong>{buildInlineDeadlineText(inlineDeadlineDraft)}</strong>
              </div>
            )}

            <div className="industrial-modal-actions">
              <button type="button" className="industrial-secondary-button" onClick={cancelInlineDeadlineDraft}>Abbrechen</button>
              <button type="button" className="industrial-button" onClick={() => void createInlineDeadlineFromProtocol()}>
                <CalendarPlus className="h-4 w-4" />Frist anlegen
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
