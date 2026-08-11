import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { CalendarPlus, FileText, Link2, Lock, Search, ShieldAlert, UserPlus } from "lucide-react";
import type { CaseRecord } from "../../core/models/case.model";
import type { ContactRecord } from "../../core/models/contact.model";
import {
  LEGAL_NORM_SUGGESTIONS,
  formatAnonymizationMarkerText,
  formatBemMarkerText,
  formatCaseReferenceText,
  formatConfidentialityText,
  formatContactReferenceText,
  formatEqualizationMarkerText,
  formatLegalNormText,
  formatOpenTaskText,
  formatParticipationMarkerText,
  formatPreventionMarkerText,
  formatRiskText,
  formatTemplateMarkerText,
  formatTerminationMarkerText,
  formatWorkplaceAccommodationMarkerText,
  getTextCommandArgument,
  getTextCommandKind,
  getTextCommandRangeLength,
  type ConfidentialCommandLevel,
  type RiskLevelCommand,
} from "@services/textCommandPolicy";
import type { TextCommandTextareaChange, TextCommandTextareaReplacement } from "./TextCommandTextarea";

type GlobalDraft = TextCommandTextareaChange & {
  fieldId: string;
  query: string;
  title: string;
  dueAt: string;
  severity: "normal" | "important" | "critical" | "fatal";
  riskLevel: RiskLevelCommand;
  confidentiality: ConfidentialCommandLevel;
  label: string;
  commandText: string;
  rangeLength: number;
};
type DraftSetter = Dispatch<SetStateAction<GlobalDraft | null>>;
type CommandKind = ReturnType<typeof getTextCommandKind>;

const TITLE_BY_KIND: Record<CommandKind, string> = {
  deadline: "Frist einfügen", follow_up: "Wiedervorlage einfügen", contact: "Kontakt einfügen",
  case_reference: "Fallbezug einfügen", legal_norm: "Rechtsnorm einfügen", risk: "Risiko markieren",
  open_task: "Aufgabe einfügen", confidentiality: "Vertraulichkeit einfügen", anonymization: "Anonymisierung vormerken",
  bem_measure: "BEM-Vorgang anlegen", prevention_measure: "Prävention anlegen", equalization_measure: "Gleichstellung/GdB anlegen",
  termination_measure: "Kündigungsanhörung anlegen", participation: "SBV-Beteiligung anlegen",
  workplace_accommodation: "Arbeitsplatzgestaltung anlegen", template: "Vorlage vormerken",
  activity_journal_time: "Journalzeit übernehmen",
};
const MEASURE_KINDS: CommandKind[] = ["bem_measure", "prevention_measure", "equalization_measure", "termination_measure", "participation", "workplace_accommodation"];
const SELECTION_KINDS: CommandKind[] = ["contact", "case_reference", "legal_norm"];

function initialDraft(detail: TextCommandTextareaChange): GlobalDraft | null {
  if (!detail.fieldId || getTextCommandKind(detail.token) === "activity_journal_time") return null;
  const commandText = getTextCommandArgument(detail.value, detail.index, detail.token);
  return { ...detail, fieldId: detail.fieldId, query: commandText.trim(), title: commandText.trim(), dueAt: "",
    severity: "important", riskLevel: "high", confidentiality: "hoch_sensibel", label: commandText || "Name",
    commandText, rangeLength: getTextCommandRangeLength(detail.value, detail.index, detail.token) };
}

function emitReplacement(draft: GlobalDraft, replacement: string) {
  const detail: TextCommandTextareaReplacement = { fieldId: draft.fieldId, markerIndex: draft.index, token: draft.token,
    replacement, rangeLength: draft.rangeLength };
  window.dispatchEvent(new CustomEvent<TextCommandTextareaReplacement>("gremia-sbv:text-command-replace", { detail }));
}

function formatDate(value: string): string {
  if (!value) return "offen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function updateDraft(setDraft: DraftSetter, patch: Partial<GlobalDraft>) {
  setDraft((current) => current ? { ...current, ...patch } : current);
}

function primaryReplacement(draft: GlobalDraft): string | null {
  const kind = getTextCommandKind(draft.token);
  if (kind === "deadline" || kind === "follow_up") return `Frist bis ${formatDate(draft.dueAt)}: ${draft.title.trim() || "Wiedervorlage"}`;
  if (kind === "risk") return formatRiskText(draft.riskLevel, draft.title);
  if (kind === "open_task") return formatOpenTaskText(draft.title);
  if (kind === "confidentiality") return formatConfidentialityText(draft.confidentiality);
  if (kind === "anonymization") return formatAnonymizationMarkerText(draft.label);
  if (kind === "bem_measure") return formatBemMarkerText(draft.title);
  if (kind === "prevention_measure") return formatPreventionMarkerText(draft.title);
  if (kind === "equalization_measure") return formatEqualizationMarkerText(draft.title);
  if (kind === "termination_measure") return formatTerminationMarkerText(draft.title);
  if (kind === "participation") return formatParticipationMarkerText(draft.title);
  if (kind === "workplace_accommodation") return formatWorkplaceAccommodationMarkerText(draft.title);
  if (kind === "template") return formatTemplateMarkerText(draft.query);
  return null;
}

function useDetectedCommand() {
  const [draft, setDraft] = useState<GlobalDraft | null>(null);
  useEffect(() => {
    const handle = (event: Event) => {
      const next = initialDraft((event as CustomEvent<TextCommandTextareaChange>).detail);
      if (next) setDraft((current) => current ?? next);
    };
    window.addEventListener("gremia-sbv:text-command-detected", handle);
    return () => window.removeEventListener("gremia-sbv:text-command-detected", handle);
  }, []);
  return [draft, setDraft] as const;
}

function DeadlineFields({ draft, setDraft }: { draft: GlobalDraft; setDraft: DraftSetter }) {
  return <div className="industrial-modal-grid">
    <label><span>Titel</span><input value={draft.title} onChange={(e) => updateDraft(setDraft, { title: e.target.value })}
      autoFocus placeholder="z. B. Rückmeldung Arbeitgeber nachhalten" /></label>
    <label><span>Datum</span><input type="datetime-local" value={draft.dueAt}
      onChange={(e) => updateDraft(setDraft, { dueAt: e.target.value })} /></label>
    <div className="industrial-modal-preview"><CalendarPlus className="h-4 w-4" /> Wird eingefügt:{" "}
      <strong>{`Frist bis ${formatDate(draft.dueAt)}: ${draft.title.trim() || "Wiedervorlage"}`}</strong></div>
  </div>;
}

function SearchFields({ label, placeholder, draft, setDraft, children }: { label: string; placeholder: string; draft: GlobalDraft;
  setDraft: DraftSetter; children: React.ReactNode }) {
  return <div className="industrial-modal-grid">
    <label className="industrial-modal-wide"><span>{label}</span><input value={draft.query}
      onChange={(e) => updateDraft(setDraft, { query: e.target.value })} autoFocus placeholder={placeholder} /></label>
    <div className="industrial-command-results">{children}</div>
  </div>;
}

function SelectionFields({ kind, draft, setDraft, cases, contacts, replace }: { kind: CommandKind; draft: GlobalDraft; setDraft: DraftSetter;
  cases: CaseRecord[]; contacts: ContactRecord[]; replace: (replacement: string) => void }) {
  const query = draft.query.trim().toLowerCase();
  const matchingCases = useMemo(() => cases.filter((item) => !query || `${item.caseNumber} ${item.displayName} ${item.summary ?? ""} ${item.category}`.toLowerCase().includes(query)).slice(0, 8), [cases, query]);
  const matchingContacts = useMemo(() => contacts.filter((item) => !query || `${item.firstName} ${item.lastName} ${item.organization ?? ""} ${item.role ?? ""} ${item.email ?? ""}`.toLowerCase().includes(query)).slice(0, 8), [contacts, query]);
  const matchingNorms = useMemo(() => LEGAL_NORM_SUGGESTIONS.filter((item) => !query || `${item.paragraph} ${item.title} ${item.shortText} ${item.source}`.toLowerCase().includes(query)).slice(0, 8), [query]);
  if (kind === "contact") return <SearchFields label="Kontakt suchen" placeholder="Name, Organisation, Rolle …" {...{ draft, setDraft }}>
    {matchingContacts.map((contact) => <button key={contact.id} type="button" onClick={() => replace(formatContactReferenceText(contact))}>
      <UserPlus className="h-4 w-4" />{formatContactReferenceText(contact)}</button>)}
    {!matchingContacts.length && <p>Kein passender Kontakt gefunden.</p>}
  </SearchFields>;
  if (kind === "case_reference") return <SearchFields label="Fall suchen" placeholder="Aktenzeichen, Name, Kurzbeschreibung …" {...{ draft, setDraft }}>
    {matchingCases.map((item) => <button key={item.id} type="button" onClick={() => replace(formatCaseReferenceText(item.caseNumber, item.displayName))}>
      <Link2 className="h-4 w-4" />{item.caseNumber} · {item.displayName}</button>)}
    {!matchingCases.length && <p>Kein passender Fall gefunden.</p>}
  </SearchFields>;
  if (kind === "legal_norm") return <SearchFields label="Norm suchen" placeholder="z. B. 167, BEM, Kündigung, AGG …" {...{ draft, setDraft }}>
    {matchingNorms.map((norm) => <button key={norm.id} type="button" onClick={() => replace(formatLegalNormText(norm))}>
      <FileText className="h-4 w-4" />{norm.paragraph} · {norm.title}</button>)}
    {!matchingNorms.length && <p>Keine passende Norm gefunden.</p>}
  </SearchFields>;
  return null;
}

function RiskAndConfidentialityFields({ kind, draft, setDraft }: { kind: CommandKind; draft: GlobalDraft; setDraft: DraftSetter }) {
  if (kind === "risk") return <div className="industrial-modal-grid">
    <label><span>Risikostufe</span><select className="industrial-select" value={draft.riskLevel} onChange={(e) => updateDraft(setDraft, { riskLevel: e.target.value as RiskLevelCommand })}>
      <option value="low">niedrig</option><option value="medium">mittel</option><option value="high">hoch</option><option value="critical">kritisch</option></select></label>
    <label className="industrial-modal-wide"><span>Hinweis</span><input value={draft.title} onChange={(e) => updateDraft(setDraft, { title: e.target.value })}
      autoFocus placeholder="z. B. Kündigungsrisiko, Chronifizierung, Blockade …" /></label>
  </div>;
  if (kind === "confidentiality") return <div className="industrial-modal-grid">
    <label><span>Stufe</span><select className="industrial-select" value={draft.confidentiality} onChange={(e) => updateDraft(setDraft, { confidentiality: e.target.value as ConfidentialCommandLevel })}>
      <option value="normal">normal</option><option value="sensibel">sensibel</option><option value="hoch_sensibel">hoch sensibel</option></select></label>
    <div className="industrial-modal-preview"><Lock className="h-4 w-4" /> Wird eingefügt: <strong>{formatConfidentialityText(draft.confidentiality)}</strong></div>
  </div>;
  return null;
}

function SimpleCommandFields({ kind, draft, setDraft }: { kind: CommandKind; draft: GlobalDraft; setDraft: DraftSetter }) {
  if (kind === "open_task") return <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Aufgabe</span>
    <input value={draft.title} onChange={(e) => updateDraft(setDraft, { title: e.target.value })} autoFocus placeholder="z. B. Inklusionsamt nachfassen" /></label></div>;
  if (kind === "anonymization") return <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Art der Textstelle</span>
    <input value={draft.label} onChange={(e) => updateDraft(setDraft, { label: e.target.value })} autoFocus placeholder="z. B. Name, Bereich, Gesundheitsdetail" /></label>
    <div className="industrial-modal-preview"><ShieldAlert className="h-4 w-4" /> Wird eingefügt: <strong>{formatAnonymizationMarkerText(draft.label)}</strong></div></div>;
  if (MEASURE_KINDS.includes(kind)) return <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Titel</span>
    <input value={draft.title} onChange={(e) => updateDraft(setDraft, { title: e.target.value })} autoFocus placeholder="z. B. Vorgang in der Fallakte anlegen" /></label>
    <div className="industrial-modal-preview"><ShieldAlert className="h-4 w-4" /> Personenbezogene Maßnahmen werden nur in einer geöffneten Fallakte strukturiert angelegt. In allgemeinen Textfeldern wird nur ein Hinweis eingefügt.</div></div>;
  if (kind === "template") return <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Vorlagenhinweis</span>
    <input value={draft.query} onChange={(e) => updateDraft(setDraft, { query: e.target.value })} autoFocus placeholder="z. B. Unterlagenanforderung" /></label>
    <div className="industrial-modal-preview"><FileText className="h-4 w-4" /> Wird eingefügt: <strong>{formatTemplateMarkerText(draft.query)}</strong></div></div>;
  return null;
}

function CommandFields({ kind, draft, setDraft, cases, contacts, replace }: { kind: CommandKind; draft: GlobalDraft; setDraft: DraftSetter;
  cases: CaseRecord[]; contacts: ContactRecord[]; replace: (replacement: string) => void }) {
  return <>
    {(kind === "deadline" || kind === "follow_up") && <DeadlineFields {...{ draft, setDraft }} />}
    <SelectionFields {...{ kind, draft, setDraft, cases, contacts, replace }} />
    <RiskAndConfidentialityFields {...{ kind, draft, setDraft }} />
    <SimpleCommandFields {...{ kind, draft, setDraft }} />
  </>;
}

export function GlobalTextCommandController({ cases, contacts }: { cases: CaseRecord[]; contacts: ContactRecord[] }) {
  const [draft, setDraft] = useDetectedCommand();
  const dialogRef = useRef<HTMLElement | null>(null);
  if (!draft) return null;
  const kind = getTextCommandKind(draft.token);
  const replace = (replacement: string) => { emitReplacement(draft, replacement); setDraft(null); };
  const applyPrimaryAction = () => { const replacement = primaryReplacement(draft); if (replacement !== null) replace(replacement); };
  const primaryActionLabel = kind === "deadline" || kind === "follow_up" ? "Einfügen" : kind === "template" ? "Vormerken" : MEASURE_KINDS.includes(kind) ? "Hinweis einfügen" : "Einfügen";
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); setDraft(null); }
    else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); applyPrimaryAction(); }
  };
  return <div className="industrial-modal-backdrop" role="presentation">
    <section ref={dialogRef} className={kind === "anonymization" ? "industrial-modal inline-anonymization-modal" : "industrial-modal"}
      role="dialog" aria-modal="true" aria-labelledby="global-text-command-title" aria-describedby="global-text-command-description"
      onKeyDown={handleDialogKeyDown}>
      <div className="industrial-modal-header"><div className="industrial-modal-icon"><Search className="h-5 w-5" /></div><div>
        <p className="industrial-kicker">Inline-Befehl</p><h2 id="global-text-command-title">{TITLE_BY_KIND[kind]}</h2>
        <p id="global-text-command-description">Dieser Befehl wirkt direkt auf das aktuell bearbeitete Textfeld. Strg+Enter speichert, Esc bricht ab.</p>
      </div></div>
      <CommandFields {...{ kind, draft, setDraft, cases, contacts, replace }} />
      <div className="industrial-modal-actions">
        <button type="button" className="industrial-secondary-button" onClick={() => setDraft(null)}>Abbrechen</button>
        {!SELECTION_KINDS.includes(kind) && <button type="button" className="industrial-button" onClick={applyPrimaryAction}>{primaryActionLabel}</button>}
      </div>
    </section>
  </div>;
}
