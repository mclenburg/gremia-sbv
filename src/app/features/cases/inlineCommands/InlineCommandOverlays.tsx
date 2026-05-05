import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Wrench,
  FolderKanban,
  Lock,
  Scale,
  ShieldAlert,
  Users
} from 'lucide-react';
import type { CaseRecord } from '../../../core/models/case.model';
import type { ContactRecord } from '../../../core/models/contact.model';
import type { LegalNormSuggestion } from '@services/textCommandPolicy';
import { filterContactsForQuery, formatContactReference } from '../../contacts/contactDisplay';
import {
  LEGAL_NORM_SUGGESTIONS,
  formatAnonymizationMarkerText,
  formatConfidentialityText,
  formatLegalNormText,
  formatOpenTaskText,
  formatRiskText,
  formatTemplateMarkerText
} from '@services/textCommandPolicy';
import { filterCasesForInlineCommand, filterNormsForInlineCommand } from './inlineCommandSearch';
import type { InlineAnonymizationDraft, InlineCaseLinkDraft, InlineConfidentialityDraft, InlineContactDraft, InlineDeadlineDraft, InlineLegalNormDraft, InlineOpenTaskDraft, InlineParticipationDraft, InlineRiskDraft, InlineTemplateDraft, InlineWorkplaceAccommodationDraft } from './useInlineCommands';
import type { ContactCategory } from '../../../core/models/contact.model';
import type { DeadlineSeverity } from '../../../core/models/deadline.model';
import type { ConfidentialCommandLevel, RiskLevelCommand } from '@services/textCommandPolicy';

type Setter<T> = (updater: (current: T | null) => T | null) => void;

export type InlineCommandOverlaysProps = {
  inlineCaseLinkDraft: InlineCaseLinkDraft | null;
  setInlineCaseLinkDraft: Setter<InlineCaseLinkDraft>;
  cases: CaseRecord[];
  insertCaseReferenceFromProtocol: (record: CaseRecord) => void | Promise<void>;
  cancelInlineCaseLinkDraft: () => void;

  inlineLegalNormDraft: InlineLegalNormDraft | null;
  setInlineLegalNormDraft: Setter<InlineLegalNormDraft>;
  insertLegalNormFromProtocol: (norm: LegalNormSuggestion) => void | Promise<void>;
  cancelInlineLegalNormDraft: () => void;

  inlineRiskDraft: InlineRiskDraft | null;
  setInlineRiskDraft: Setter<InlineRiskDraft>;
  insertRiskFromProtocol: () => void | Promise<void>;
  cancelInlineRiskDraft: () => void;

  inlineOpenTaskDraft: InlineOpenTaskDraft | null;
  setInlineOpenTaskDraft: Setter<InlineOpenTaskDraft>;
  createOpenTaskFromProtocol: () => void | Promise<void>;
  cancelInlineOpenTaskDraft: () => void;

  inlineConfidentialityDraft: InlineConfidentialityDraft | null;
  setInlineConfidentialityDraft: Setter<InlineConfidentialityDraft>;
  applyConfidentialityFromProtocol: () => void;
  cancelInlineConfidentialityDraft: () => void;

  inlineAnonymizationDraft: InlineAnonymizationDraft | null;
  setInlineAnonymizationDraft: Setter<InlineAnonymizationDraft>;
  applyAnonymizationMarkerFromProtocol: () => void;
  cancelInlineAnonymizationDraft: () => void;

  inlineContactDraft: InlineContactDraft | null;
  setInlineContactDraft: Setter<InlineContactDraft>;
  contacts: ContactRecord[];
  insertExistingContactFromProtocol: (contact: ContactRecord) => void | Promise<void>;
  createAndInsertContactFromProtocol: () => void | Promise<void>;
  cancelInlineContactDraft: () => void;

  inlineParticipationDraft: InlineParticipationDraft | null;
  setInlineParticipationDraft: Setter<InlineParticipationDraft>;
  createParticipationFromProtocol: () => void | Promise<void>;
  cancelInlineParticipationDraft: () => void;

  inlineWorkplaceAccommodationDraft: InlineWorkplaceAccommodationDraft | null;
  setInlineWorkplaceAccommodationDraft: Setter<InlineWorkplaceAccommodationDraft>;
  createWorkplaceAccommodationFromProtocol: () => void | Promise<void>;
  cancelInlineWorkplaceAccommodationDraft: () => void;

  inlineTemplateDraft: InlineTemplateDraft | null;
  setInlineTemplateDraft: Setter<InlineTemplateDraft>;
  applyTemplateMarkerFromProtocol: () => void;
  cancelInlineTemplateDraft: () => void;

  inlineDeadlineDraft: InlineDeadlineDraft | null;
  setInlineDeadlineDraft: Setter<InlineDeadlineDraft>;
  selectedCase?: CaseRecord;
  buildInlineDeadlineText: (draft: InlineDeadlineDraft) => string;
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
    inlineParticipationDraft,
    setInlineParticipationDraft,
    createParticipationFromProtocol,
    cancelInlineParticipationDraft,
    inlineWorkplaceAccommodationDraft,
    setInlineWorkplaceAccommodationDraft,
    createWorkplaceAccommodationFromProtocol,
    cancelInlineWorkplaceAccommodationDraft,
    inlineTemplateDraft,
    setInlineTemplateDraft,
    applyTemplateMarkerFromProtocol,
    cancelInlineTemplateDraft,
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
            <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Fall suchen</span><input value={inlineCaseLinkDraft.query} onChange={(event) => setInlineCaseLinkDraft((current) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="Aktenzeichen, Name/Pseudonym, Kategorie …" /></label></div>
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
            <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Norm suchen</span><input value={inlineLegalNormDraft.query} onChange={(event) => setInlineLegalNormDraft((current) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="z. B. 178, Prävention, Kündigung, AGG …" /></label></div>
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
              <label><span>Risikostufe</span><select value={inlineRiskDraft.level} onChange={(event) => setInlineRiskDraft((current) => current ? { ...current, level: event.target.value as RiskLevelCommand } : current)}><option value="low">niedrig</option><option value="medium">mittel</option><option value="high">hoch</option><option value="critical">kritisch</option></select></label>
              <label className="industrial-modal-wide"><span>Hinweis</span><input value={inlineRiskDraft.text} onChange={(event) => setInlineRiskDraft((current) => current ? { ...current, text: event.target.value } : current)} autoFocus placeholder="z. B. Kündigungsrisiko, Chronifizierungsrisiko, Arbeitgeber blockiert …" /></label>
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
            <div className="industrial-modal-grid"><label><span>Aufgabe</span><input value={inlineOpenTaskDraft.title} onChange={(event) => setInlineOpenTaskDraft((current) => current ? { ...current, title: event.target.value } : current)} autoFocus placeholder="z. B. Inklusionsamt nachfassen" /></label><label><span>Stufe</span><select value={inlineOpenTaskDraft.severity} onChange={(event) => setInlineOpenTaskDraft((current) => current ? { ...current, severity: event.target.value as DeadlineSeverity } : current)}><option value="normal">normal</option><option value="important">wichtig</option><option value="critical">kritisch</option><option value="fatal">fatal</option></select></label><label className="industrial-modal-wide"><span>Notiz</span><input value={inlineOpenTaskDraft.description} onChange={(event) => setInlineOpenTaskDraft((current) => current ? { ...current, description: event.target.value } : current)} /></label></div>
            <div className="industrial-modal-preview">Wird eingefügt: <strong>{formatOpenTaskText(inlineOpenTaskDraft.title)}</strong></div>
            <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineOpenTaskDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={() => void createOpenTaskFromProtocol()}>Aufgabe anlegen</button></div>
          </section>
        </div>
      )}

      {inlineConfidentialityDraft && (
        <div className="industrial-modal-backdrop" role="presentation"><section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-conf-title"><div className="industrial-modal-header"><div className="industrial-modal-icon"><Lock className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Vertraulichkeit</p><h2 id="inline-conf-title">Vertraulichkeitsstufe anheben</h2><p>Setzt die Vertraulichkeitsstufe der gesamten Notiz direkt hoch.</p></div></div><div className="industrial-modal-grid"><label><span>Stufe</span><select value={inlineConfidentialityDraft.level} onChange={(event) => setInlineConfidentialityDraft((current) => current ? { ...current, level: event.target.value as ConfidentialCommandLevel } : current)}><option value="normal">normal</option><option value="sensibel">sensibel</option><option value="hoch_sensibel">hoch sensibel</option></select></label></div><div className="industrial-modal-preview">Wird eingefügt: <strong>{formatConfidentialityText(inlineConfidentialityDraft.level)}</strong></div><div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineConfidentialityDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={applyConfidentialityFromProtocol}>Übernehmen</button></div></section></div>
      )}

      {inlineAnonymizationDraft && (
        <div className="industrial-modal-backdrop" role="presentation"><section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-anon-title"><div className="industrial-modal-header"><div className="industrial-modal-icon"><ShieldAlert className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Anonymisierung</p><h2 id="inline-anon-title">Anonymisierung vormerken</h2><p>Setzt eine sichtbare Vormerkung im Protokoll. Berichtslogik kann diese Markierung später gezielt auswerten.</p></div></div><div className="industrial-modal-grid"><label><span>Art der Textstelle</span><input value={inlineAnonymizationDraft.label} onChange={(event) => setInlineAnonymizationDraft((current) => current ? { ...current, label: event.target.value } : current)} autoFocus placeholder="z. B. Name, Bereich, Funktion, Gesundheitsdetail" /></label></div><div className="industrial-modal-preview">Wird eingefügt: <strong>{formatAnonymizationMarkerText(inlineAnonymizationDraft.label)}</strong></div><div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineAnonymizationDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={applyAnonymizationMarkerFromProtocol}>Vormerken</button></div></section></div>
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
                  onChange={(event) => setInlineContactDraft((current) => current ? { ...current, query: event.target.value } : current)}
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
              <label><span>Vorname</span><input value={inlineContactDraft.firstName} onChange={(event) => setInlineContactDraft((current) => current ? { ...current, firstName: event.target.value } : current)} /></label>
              <label><span>Nachname</span><input value={inlineContactDraft.lastName} onChange={(event) => setInlineContactDraft((current) => current ? { ...current, lastName: event.target.value } : current)} /></label>
              <label><span>Firma / Stelle</span><input value={inlineContactDraft.organization} onChange={(event) => setInlineContactDraft((current) => current ? { ...current, organization: event.target.value } : current)} /></label>
              <label><span>Rolle</span><input value={inlineContactDraft.role} onChange={(event) => setInlineContactDraft((current) => current ? { ...current, role: event.target.value } : current)} placeholder="z. B. Personalleiter" /></label>
              <label><span>Kategorie</span><select value={inlineContactDraft.category} onChange={(event) => setInlineContactDraft((current) => current ? { ...current, category: event.target.value as ContactCategory } : current)}><option value="arbeitgeber">Arbeitgeber</option><option value="inklusionsamt">Inklusionsamt</option><option value="agentur_fuer_arbeit">Agentur für Arbeit</option><option value="betriebsarzt">Betriebsarzt</option><option value="betriebsrat">Betriebsrat</option><option value="beratung">Beratung</option><option value="intern">intern</option><option value="sonstiges">sonstiges</option></select></label>
              <label><span>E-Mail</span><input value={inlineContactDraft.email} onChange={(event) => setInlineContactDraft((current) => current ? { ...current, email: event.target.value } : current)} /></label>
              <label><span>Telefon</span><input value={inlineContactDraft.phone} onChange={(event) => setInlineContactDraft((current) => current ? { ...current, phone: event.target.value } : current)} /></label>
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

      {inlineParticipationDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal inline-command-quick" role="dialog" aria-modal="true" aria-labelledby="inline-participation-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><ClipboardCheck className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Inline-Maßnahme</p>
                <h2 id="inline-participation-title">SBV-Beteiligung anlegen</h2>
                <p>Legt die Beteiligung direkt als Maßnahme in der aktuellen Fallakte an. Details können nach dem Gespräch ergänzt werden.</p>
              </div>
            </div>
            <div className="industrial-modal-grid">
              <label className="industrial-modal-wide"><span>Titel</span><input value={inlineParticipationDraft.title} onChange={(event) => setInlineParticipationDraft((current) => current ? { ...current, title: event.target.value } : current)} autoFocus placeholder="z. B. Versetzung ohne vorherige SBV-Anhörung" /></label>
              <label><span>Arbeitgebermaßnahme / Kurznotiz</span><input value={inlineParticipationDraft.employerMeasure} onChange={(event) => setInlineParticipationDraft((current) => current ? { ...current, employerMeasure: event.target.value } : current)} placeholder="z. B. Versetzung angekündigt, Unterlagen fehlen" /></label>
              <label><span>Risikostufe</span><select value={inlineParticipationDraft.riskLevel} onChange={(event) => setInlineParticipationDraft((current) => current ? { ...current, riskLevel: event.target.value as InlineParticipationDraft['riskLevel'] } : current)}><option value="normal">normal</option><option value="erhoeht">erhöht</option><option value="kritisch">kritisch</option></select></label>
              <label><span>Stellungnahmefrist optional</span><input type="datetime-local" value={inlineParticipationDraft.statementDueAt} onChange={(event) => setInlineParticipationDraft((current) => current ? { ...current, statementDueAt: event.target.value } : current)} /></label>
              <label className="industrial-modal-wide"><span>Nächster Schritt</span><input value={inlineParticipationDraft.nextStep} onChange={(event) => setInlineParticipationDraft((current) => current ? { ...current, nextStep: event.target.value } : current)} /></label>
            </div>
            <div className="industrial-modal-preview"><ClipboardCheck className="h-4 w-4" /> Wird als Fallaktenmaßnahme angelegt: <strong>{inlineParticipationDraft.title.trim() || 'SBV-Beteiligung'}</strong></div>
            <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineParticipationDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={() => void createParticipationFromProtocol()}>Anlegen und weiterprotokollieren</button></div>
          </section>
        </div>
      )}



      {inlineWorkplaceAccommodationDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal inline-command-quick" role="dialog" aria-modal="true" aria-labelledby="inline-workplace-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><Wrench className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Inline-Maßnahme</p>
                <h2 id="inline-workplace-title">Arbeitsplatzgestaltung anlegen</h2>
                <p>Legt eine Maßnahme nach § 164 Abs. 4 SGB IX direkt in der aktuellen Fallakte an. Details können nach dem Gespräch ergänzt werden.</p>
              </div>
            </div>
            <div className="industrial-modal-grid">
              <label className="industrial-modal-wide"><span>Titel</span><input value={inlineWorkplaceAccommodationDraft.title} onChange={(event) => setInlineWorkplaceAccommodationDraft((current) => current ? { ...current, title: event.target.value } : current)} autoFocus placeholder="z. B. fester Arbeitsplatz / technische Arbeitshilfe" /></label>
              <label className="industrial-modal-wide"><span>Gewünschte Gestaltung / Kurznotiz</span><input value={inlineWorkplaceAccommodationDraft.requestedAdjustment} onChange={(event) => setInlineWorkplaceAccommodationDraft((current) => current ? { ...current, requestedAdjustment: event.target.value } : current)} placeholder="z. B. fester Arbeitsplatz wegen behinderungsbedingter Belastung" /></label>
              <label><span>Kategorie</span><select value={inlineWorkplaceAccommodationDraft.category} onChange={(event) => setInlineWorkplaceAccommodationDraft((current) => current ? { ...current, category: event.target.value as InlineWorkplaceAccommodationDraft['category'] } : current)}><option value="arbeitsplatz">Arbeitsplatz</option><option value="arbeitsumfeld">Arbeitsumfeld</option><option value="arbeitsorganisation">Arbeitsorganisation</option><option value="arbeitszeit">Arbeitszeit</option><option value="arbeitsort">Arbeitsort / mobile Arbeit</option><option value="technische_arbeitshilfe">technische Arbeitshilfe</option><option value="software_barrierefreiheit">Software / Barrierefreiheit</option><option value="qualifizierung">Qualifizierung</option><option value="aufgabenanpassung">Aufgabenanpassung</option><option value="sonstiges">Sonstiges</option></select></label>
              <label><span>Risikostufe</span><select value={inlineWorkplaceAccommodationDraft.riskLevel} onChange={(event) => setInlineWorkplaceAccommodationDraft((current) => current ? { ...current, riskLevel: event.target.value as InlineWorkplaceAccommodationDraft['riskLevel'] } : current)}><option value="normal">normal</option><option value="erhoeht">erhöht</option><option value="kritisch">kritisch</option></select></label>
              <label><span>Umsetzungs-/Wiedervorlage optional</span><input type="datetime-local" value={inlineWorkplaceAccommodationDraft.implementationDueAt} onChange={(event) => setInlineWorkplaceAccommodationDraft((current) => current ? { ...current, implementationDueAt: event.target.value } : current)} /></label>
              <label className="industrial-modal-wide"><span>Nächster Schritt</span><input value={inlineWorkplaceAccommodationDraft.nextStep} onChange={(event) => setInlineWorkplaceAccommodationDraft((current) => current ? { ...current, nextStep: event.target.value } : current)} /></label>
            </div>
            <div className="industrial-modal-preview"><Wrench className="h-4 w-4" /> Wird als Fallaktenmaßnahme angelegt: <strong>{inlineWorkplaceAccommodationDraft.title.trim() || 'Arbeitsplatzgestaltung'}</strong></div>
            <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineWorkplaceAccommodationDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={() => void createWorkplaceAccommodationFromProtocol()}>Anlegen und weiterprotokollieren</button></div>
          </section>
        </div>
      )}

      {inlineTemplateDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal inline-command-quick" role="dialog" aria-modal="true" aria-labelledby="inline-template-title">
            <div className="industrial-modal-header"><div className="industrial-modal-icon"><FileText className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Vorlage</p><h2 id="inline-template-title">Vorlage vormerken</h2><p>Der Vorlagenbezug wird im Protokoll markiert. Die konkrete Dokumenterzeugung bleibt im Vorlagenmodul.</p></div></div>
            <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Such-/Vorlagenhinweis</span><input value={inlineTemplateDraft.query} onChange={(event) => setInlineTemplateDraft((current) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="z. B. Unterlagenanforderung Beteiligung" /></label></div>
            <div className="industrial-modal-preview"><FileText className="h-4 w-4" /> Wird eingefügt: <strong>{formatTemplateMarkerText(inlineTemplateDraft.query)}</strong></div>
            <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={cancelInlineTemplateDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={applyTemplateMarkerFromProtocol}>Vormerken</button></div>
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
                  onChange={(event) => setInlineDeadlineDraft((current) => current ? { ...current, title: event.target.value } : current)}
                  placeholder="z. B. Antwort Arbeitgeber nachhalten"
                  autoFocus
                />
              </label>
              <label>
                <span>Ablaufdatum</span>
                <input
                  type="datetime-local"
                  value={inlineDeadlineDraft.dueAt}
                  onChange={(event) => setInlineDeadlineDraft((current) => current ? { ...current, dueAt: event.target.value } : current)}
                />
              </label>
              <label>
                <span>Stufe</span>
                <select
                  value={inlineDeadlineDraft.severity}
                  onChange={(event) => setInlineDeadlineDraft((current) => current ? { ...current, severity: event.target.value as DeadlineSeverity } : current)}
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
                  onChange={(event) => setInlineDeadlineDraft((current) => current ? { ...current, legalBasis: event.target.value } : current)}
                  placeholder="optional"
                />
              </label>
              <label className="industrial-modal-wide">
                <span>Notiz zur Frist</span>
                <input
                  value={inlineDeadlineDraft.description}
                  onChange={(event) => setInlineDeadlineDraft((current) => current ? { ...current, description: event.target.value } : current)}
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
