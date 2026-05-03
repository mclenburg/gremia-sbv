import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  FileText,
  Download,
  FolderOpen,
  FolderKanban,
  MessageSquare,
  Save,
  Search,
  HardDrive,
  HeartPulse,
  Lock,
  LockKeyhole,
  LogOut,
  Moon,
  Sun,
  Plus,
  Scale,
  Settings as SettingsIcon,
  ShieldAlert,
  HelpCircle,
  TerminalSquare,
  Trash2,
  Users,
  Workflow
} from 'lucide-react';
import { DashboardCard } from './shared/components/DashboardCard';
import { ModuleFrame } from './shared/components/ModuleFrame';
import { PlaceholderView } from './shared/components/PlaceholderView';
import { ShellNav } from './shell/ShellNav';
import { modules, type ViewId } from './core/navigation/modules';
import { useModalKeyboardShortcuts } from './core/keyboard/useModalKeyboardShortcuts';
import { DeadlineDashboardPanel } from './features/deadlines/DeadlineDashboardPanel';
import { DeadlineListView } from './features/deadlines/DeadlineListView';
import type { CaseCategory, CaseRecord } from './core/models/case.model';
import type { ContactCategory, ContactRecord, CreateContactInput, DeleteContactResult } from './core/models/contact.model';
import type { CaseDocumentRecord } from './core/models/case-document.model';
import type { CaseNoteRecord, CaseNoteType, CaseSearchResult, ConfidentialLevel } from './core/models/case-note.model';
import type { CreateDeadlineInput, DeadlineDashboardItem, DeadlineProcessType, DeadlineRecord, DeadlineSeverity, DeadlineType } from './core/models/deadline.model';
import type { GenerateReportInput, ReportDescriptor, ReportExportHistoryItem, ReportGenerationResult, ReportType } from './core/models/report.model';
import type { BackupInspectionResult, BackupOperationResult } from './core/models/backup.model';
import type { RetentionCandidate, RetentionDashboard, RetentionOperationResult, RetentionSettings } from './core/models/retention.model';
import type { CreatePreventionProcessInput, PreventionDifficultyType, PreventionProcessRecord, PreventionRiskType, PreventionStatus, PreventionStepDefinition, PreventionWarning, UpdatePreventionProcessInput } from './core/models/prevention.model';
import type { CaseLawRecord, CaseLegalReferenceRecord, LegalNormRecord, NormChecklistItemRecord, NormCommentRecord } from './core/models/knowledge.model';
import type { ContextualTemplateAction, CreateTemplateInput, RenderedTemplateResult, TemplateCategory, TemplateRecord } from './core/models/template.model';
import { APP_VERSION } from './generated/appVersion';
import {
  LEGAL_NORM_SUGGESTIONS,
  findFirstTextCommand,
  formatAnonymizationMarkerText,
  formatCaseReferenceText,
  formatConfidentialityText,
  formatLegalNormText,
  formatOpenTaskText,
  formatRiskText,
  removeCommandMarker,
  replaceCommandMarker,
  type ConfidentialCommandLevel,
  type LegalNormSuggestion,
  type RiskLevelCommand,
  type TextCommandToken
} from '@services/textCommandPolicy';
import { missingPlaceholderWarning, resolveContextualTemplateAction } from '@services/templateContextPolicy';
import { buildExportWarningMessage, scanSensitiveExportText } from '@services/exportGuardPolicy';
import './caseModalResponsive.css';
import './caseWorkbench.css';
import './accessibility.css';
import './templateWorkbench.css';
import './templateDefaults.css';
import './processOverview.css';
import './knowledgeWorkbench.css';
import { ConfirmDialogProvider, useConfirmDialog } from './shared/dialogs/ConfirmDialogProvider';
import { LiveRegionProvider, useAnnouncer } from './shared/a11y/LiveRegionProvider';
import './confirmDialog.css';
import './accessibilityLiveRegion.css';


function nowLabel(): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
}

function validatePassword(password: string): string | null {
  if (password.length < 12) {
    return 'Das Passwort muss mindestens 12 Zeichen lang sein.';
  }
  return null;
}

type AuthMode = 'loading' | 'setup' | 'login' | 'recovery' | 'unavailable';
type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'gremia.sbv.theme';

const TEMPLATE_DEFAULT_VALUES_STORAGE_KEY = 'gremia.sbv.templateDefaultValues';

type TemplateDefaultKey =
  | 'sbv.name'
  | 'sbv.funktion'
  | 'sbv.email'
  | 'sbv.telefon'
  | 'sbv.signatur'
  | 'arbeitgeber.ansprechpartner'
  | 'arbeitgeber.personalabteilung'
  | 'arbeitgeber.name'
  | 'unternehmen.name'
  | 'standort.name';

type TemplateDefaultValues = Record<TemplateDefaultKey, string>;

type TemplateDefaultsBridge = {
  templateDefaults?: {
    list(): Promise<TemplateDefaultValues>;
    save(values: TemplateDefaultValues): Promise<TemplateDefaultValues>;
  };
};

const TEMPLATE_DEFAULT_FIELDS: Array<{ key: TemplateDefaultKey; label: string; description: string; multiline?: boolean }> = [
  { key: 'sbv.name', label: '{{sbv.name}}', description: 'Name oder Funktionsbezeichnung der SBV.' },
  { key: 'sbv.funktion', label: '{{sbv.funktion}}', description: 'Funktion, z. B. Schwerbehindertenvertretung.' },
  { key: 'sbv.email', label: '{{sbv.email}}', description: 'Kontakt-E-Mail der SBV.' },
  { key: 'sbv.telefon', label: '{{sbv.telefon}}', description: 'Telefon oder interne Durchwahl.' },
  { key: 'sbv.signatur', label: '{{sbv.signatur}}', description: 'Standard-Signatur für Schreiben.', multiline: true },
  { key: 'arbeitgeber.ansprechpartner', label: '{{arbeitgeber.ansprechpartner}}', description: 'Standard-Ansprechstelle, z. B. Personalabteilung.' },
  { key: 'arbeitgeber.personalabteilung', label: '{{arbeitgeber.personalabteilung}}', description: 'Bezeichnung der Personalabteilung.' },
  { key: 'arbeitgeber.name', label: '{{arbeitgeber.name}}', description: 'Name des Arbeitgebers.' },
  { key: 'unternehmen.name', label: '{{unternehmen.name}}', description: 'Unternehmens- oder Dienststellenname.' },
  { key: 'standort.name', label: '{{standort.name}}', description: 'Standard-Standort.' }
];

const EMPTY_TEMPLATE_DEFAULT_VALUES: TemplateDefaultValues = {
  'sbv.name': 'Schwerbehindertenvertretung',
  'sbv.funktion': 'Schwerbehindertenvertretung',
  'sbv.email': '',
  'sbv.telefon': '',
  'sbv.signatur': 'Mit freundlichen Grüßen\nSchwerbehindertenvertretung',
  'arbeitgeber.ansprechpartner': 'Personalabteilung',
  'arbeitgeber.personalabteilung': 'Personalabteilung',
  'arbeitgeber.name': '',
  'unternehmen.name': '',
  'standort.name': ''
};

function normalizeTemplateDefaultValues(input: Partial<Record<string, unknown>> | null | undefined): TemplateDefaultValues {
  const next = { ...EMPTY_TEMPLATE_DEFAULT_VALUES };
  for (const field of TEMPLATE_DEFAULT_FIELDS) {
    const value = input?.[field.key];
    next[field.key] = typeof value === 'string' ? value : next[field.key];
  }
  return next;
}

function readTemplateDefaultValuesFromLocalStorage(): TemplateDefaultValues {
  try {
    const raw = window.localStorage.getItem(TEMPLATE_DEFAULT_VALUES_STORAGE_KEY);
    return normalizeTemplateDefaultValues(raw ? JSON.parse(raw) as Record<string, unknown> : null);
  } catch {
    return { ...EMPTY_TEMPLATE_DEFAULT_VALUES };
  }
}

function writeTemplateDefaultValuesToLocalStorage(values: TemplateDefaultValues): void {
  try {
    window.localStorage.setItem(TEMPLATE_DEFAULT_VALUES_STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Fallback-Speicherung kann blockiert sein; die laufende Sitzung bleibt trotzdem nutzbar.
  }
}

async function loadTemplateDefaultValues(): Promise<TemplateDefaultValues> {
  const bridge = await waitForBridge();
  const defaultsBridge = bridge as unknown as TemplateDefaultsBridge | null;
  if (defaultsBridge?.templateDefaults?.list) {
    return normalizeTemplateDefaultValues(await defaultsBridge.templateDefaults.list());
  }
  return readTemplateDefaultValuesFromLocalStorage();
}

async function saveTemplateDefaultValues(values: TemplateDefaultValues): Promise<TemplateDefaultValues> {
  const normalized = normalizeTemplateDefaultValues(values);
  const bridge = await waitForBridge();
  const defaultsBridge = bridge as unknown as TemplateDefaultsBridge | null;
  if (defaultsBridge?.templateDefaults?.save) {
    return normalizeTemplateDefaultValues(await defaultsBridge.templateDefaults.save(normalized));
  }
  writeTemplateDefaultValuesToLocalStorage(normalized);
  return normalized;
}


function getInitialTheme(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage kann in Sonderumgebungen blockiert sein; dann bleibt Dark Industrial Standard.
  }
  return 'dark';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function toDateTimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

function formatCaseLabel(record: CaseRecord): string {
  return `${record.caseNumber} · ${record.displayName}`;
}

function defaultDeadlineTitleForCase(record?: CaseRecord, noteTitle?: string): string {
  if (noteTitle?.trim()) return `Wiedervorlage: ${noteTitle.trim()}`;
  if (record?.caseNumber) return `Wiedervorlage ${record.caseNumber}`;
  return 'Wiedervorlage aus Protokoll';
}

function formatInlineDeadlineDate(value: string): string {
  if (!value) return 'Datum offen';
  const date = new Date(fromDateTimeLocalValue(value));
  if (Number.isNaN(date.getTime())) return 'Datum offen';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function buildInlineDeadlineText(draft: InlineDeadlineDraft): string {
  const dateLabel = formatInlineDeadlineDate(draft.dueAt);
  const title = draft.title.trim() || 'Wiedervorlage';
  return `Frist bis ${dateLabel}: ${title}`;
}

function formatContactReference(contact: ContactRecord | Pick<ContactRecord, 'firstName' | 'lastName' | 'organization'>): string {
  const lastName = contact.lastName.trim();
  const firstName = contact.firstName.trim();
  const name = [lastName, firstName].filter(Boolean).join(', ');
  const organization = contact.organization?.trim();
  return organization ? `${name} (${organization})` : name;
}

function filterContactsForQuery(contacts: ContactRecord[], query: string): ContactRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts.slice(0, 12);
  return contacts.filter((contact) =>
    contact.firstName.toLowerCase().includes(q)
    || contact.lastName.toLowerCase().includes(q)
    || (contact.organization ?? '').toLowerCase().includes(q)
    || (contact.role ?? '').toLowerCase().includes(q)
    || (contact.email ?? '').toLowerCase().includes(q)
  ).slice(0, 12);
}

function replaceRange(value: string, start: number, length: number, replacement: string): string {
  return `${value.slice(0, start)}${replacement}${value.slice(start + length)}`;
}

function getBridge(): Window['gremiaSbv'] | null {
  return window.gremiaSbv ?? null;
}

async function waitForBridge(timeoutMs = 2500): Promise<Window['gremiaSbv'] | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const bridge = getBridge();
    if (bridge?.security) return bridge;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return getBridge();
}

function SecurityUnavailable() {
  return (
    <main className="industrial-shell flex min-h-screen items-center justify-center px-6 py-8 text-zinc-100">
      <section className="login-panel relative w-full max-w-md overflow-hidden rounded-none border border-yellow-500/40 bg-zinc-950/95 p-7 shadow-2xl">
        <div className="scanline" />
        <div className="mb-5 flex items-center gap-3 border-b border-zinc-800 pb-5">
          <div className="grid h-11 w-11 place-items-center border border-yellow-400 bg-yellow-400/10 text-yellow-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="industrial-kicker">Gremia.SBV</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">Start nicht abgeschlossen</h1>
          </div>
        </div>
        <p className="text-sm leading-6 text-zinc-300">
          Die interne Sicherheitsbrücke wurde nicht geladen. Bitte die Anwendung schließen, neu starten und bei erneutem Auftreten die Terminalausgabe prüfen.
        </p>
      </section>
    </main>
  );
}

function RecoveryKeyPanel({ recoveryKey, onConfirm }: { recoveryKey: string; onConfirm: () => void }) {
  return (
    <main className="industrial-shell flex min-h-screen items-center justify-center px-6 py-8 text-zinc-100">
      <section className="login-panel relative w-full max-w-2xl overflow-hidden rounded-none border border-yellow-500/40 bg-zinc-950/95 p-7 shadow-2xl">
        <div className="scanline" />
        <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-5">
          <div className="grid h-11 w-11 place-items-center border border-yellow-400 bg-yellow-400/10 text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.22)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <p className="industrial-kicker">Recovery-Key</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">Sicher verwahren</h1>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-6 text-zinc-300">
          <p>
            Dieser Recovery-Key ist die einzige Möglichkeit, das Passwort zurückzusetzen, wenn das aktuelle Passwort nicht mehr bekannt ist.
            Er wird nicht im Klartext gespeichert und später nicht erneut angezeigt.
          </p>
          <div className="border border-yellow-500/50 bg-yellow-500/10 p-4 font-mono text-lg font-black tracking-[0.18em] text-yellow-100 select-all">
            {recoveryKey}
          </div>
          <p className="text-zinc-400">
            Bitte außerhalb der App sicher ablegen, zum Beispiel in einem versiegelten Umschlag oder einem freigegebenen Passwort-Tresor der berechtigten SBV-Person.
          </p>
          <button type="button" className="industrial-button w-full" onClick={onConfirm}>
            Ich habe den Recovery-Key sicher gespeichert
          </button>
        </div>
      </section>
    </main>
  );
}

function RecoveryGate({ onUnlock, onResetToSetup }: { onUnlock: () => void; onResetToSetup: () => void }) {
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== repeatPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
        return;
      }

      const result = await bridge.security.resetPasswordWithRecoveryKey(recoveryKey, newPassword);
      if (!result.ok || !result.unlocked) {
        setError(result.error ?? 'Das Passwort konnte nicht zurückgesetzt werden.');
        return;
      }

      onUnlock();
    } catch (error) {
      console.error('Gremia.SBV recovery operation failed', error);
      setError('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    }
  }

  async function destroyVault() {
    setError('');
    setMessage('');

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
        return;
      }

      const result = await bridge.security.destroyLocalVault(confirmation);
      if (!result.ok) {
        setError(result.error ?? 'Der lokale Datenbestand konnte nicht verworfen werden.');
        return;
      }

      setMessage('Der lokale Datenbestand wurde verworfen. Es kann ein neuer leerer Datenbestand eingerichtet werden.');
      onResetToSetup();
    } catch (error) {
      console.error('Gremia.SBV destructive reset failed', error);
      setError('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    }
  }

  return (
    <main className="industrial-shell flex min-h-screen items-center justify-center px-6 py-8 text-zinc-100">
      <section className="login-panel relative w-full max-w-3xl overflow-hidden rounded-none border border-yellow-500/40 bg-zinc-950/95 p-7 shadow-2xl">
        <div className="scanline" />
        <div className="mb-7 flex items-center gap-3 border-b border-zinc-800 pb-5">
          <div className="grid h-11 w-11 place-items-center border border-yellow-400 bg-yellow-400/10 text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.22)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="industrial-kicker">Geschützter Datenbestand</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">Wiederherstellung erforderlich</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={resetPassword} className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-zinc-100">Passwort zurücksetzen</h2>
            <p className="text-sm leading-6 text-zinc-400">
              Ein vorhandener Datenbestand wurde erkannt. Ein neues Passwort kann nur mit dem Recovery-Key gesetzt werden.
            </p>
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">Recovery-Key</span>
              <input className="industrial-input w-full" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">Neues Passwort</span>
              <input className="industrial-input w-full" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">Wiederholung</span>
              <input className="industrial-input w-full" type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} />
            </label>
            <button type="submit" className="industrial-button w-full">
              Passwort zurücksetzen
            </button>
          </form>

          <div className="border border-red-500/35 bg-red-500/5 p-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-red-100">Datenbestand verwerfen</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Ohne Passwort und ohne Recovery-Key ist ein Zugriff auf den vorhandenen Datenbestand nicht vorgesehen. Es kann nur ein neuer leerer Datenbestand angelegt werden.
            </p>
            <label className="mt-4 block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">Bestätigung</span>
              <input
                className="industrial-input w-full"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DATENBESTAND LÖSCHEN"
              />
            </label>
            <button type="button" className="industrial-danger-button mt-4 w-full" onClick={destroyVault}>
              Lokalen Datenbestand unwiderruflich löschen
            </button>
          </div>
        </div>

        {error && <div className="industrial-message industrial-message-warning mt-5">{error}</div>}
        {message && <div className="industrial-message industrial-message-ok mt-5">{message}</div>}
      </section>
    </main>
  );
}

function LoginGate({ mode, onUnlock, onResetToSetup }: { mode: AuthMode; onUnlock: () => void; onResetToSetup: () => void }) {
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState('');
  const [error, setError] = useState('');

  const isSetup = mode === 'setup';

  if (mode === 'unavailable') {
    return <SecurityUnavailable />;
  }

  if (mode === 'recovery') {
    return <RecoveryGate onUnlock={onUnlock} onResetToSetup={onResetToSetup} />;
  }

  if (pendingRecoveryKey) {
    return <RecoveryKeyPanel recoveryKey={pendingRecoveryKey} onConfirm={onUnlock} />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isSetup && password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
        return;
      }

      if (isSetup) {
        const result = await bridge.security.setupInitialPassword(password);
        if (!result.ok) {
          setError(result.error ?? 'Das Initialpasswort konnte nicht gespeichert werden.');
          return;
        }
        if (result.recoveryKey) {
          setPendingRecoveryKey(result.recoveryKey);
          return;
        }
        onUnlock();
        return;
      }

      const result = await bridge.security.unlock(password);
      if (!result.ok || !result.unlocked) {
        setError(result.error ?? 'Entsperren fehlgeschlagen.');
        return;
      }
      onUnlock();
    } catch (error) {
      console.error('Gremia.SBV security operation failed', error);
      setError('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    }
  }

  if (mode === 'loading') {
    return (
      <main className="industrial-shell flex min-h-screen items-center justify-center px-6 py-8 text-zinc-100">
        <section className="login-panel relative w-full max-w-md overflow-hidden rounded-none border border-zinc-700 bg-zinc-950/95 p-7 shadow-2xl">
          <div className="scanline" />
          <p className="industrial-kicker">Gremia.SBV</p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">Initialisierung</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="industrial-shell flex min-h-screen items-center justify-center px-6 py-8 text-zinc-100">
      <section className="login-panel relative w-full max-w-md overflow-hidden rounded-none border border-zinc-700 bg-zinc-950/95 p-7 shadow-2xl">
        <div className="scanline" />
        <div className="mb-7 flex items-center gap-3 border-b border-zinc-800 pb-5">
          <div className="grid h-11 w-11 place-items-center border border-yellow-400 bg-yellow-400/10 text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.22)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-yellow-300">
              {isSetup ? 'Ersteinrichtung' : 'Entsperren'}
            </p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">Gremia.SBV</h1>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">
              {isSetup ? 'Initialpasswort' : 'App-Passwort'}
            </span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              className="industrial-input w-full"
              placeholder={isSetup ? 'Initialpasswort festlegen' : 'Passwort eingeben'}
            />
          </label>

          {isSetup && (
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">
                Wiederholung
              </span>
              <input
                type="password"
                value={passwordRepeat}
                onChange={(event) => {
                  setPasswordRepeat(event.target.value);
                  setError('');
                }}
                className="industrial-input w-full"
                placeholder="Initialpasswort wiederholen"
              />
            </label>
          )}

          {error && (
            <div className="flex gap-3 border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
              <p>{error}</p>
            </div>
          )}

          <button type="submit" className="industrial-button w-full">
            <Lock className="h-4 w-4" />
            {isSetup ? 'Initialpasswort speichern' : 'Entsperren'}
          </button>
        </form>
      </section>
    </main>
  );
}

function DashboardOverview({
  onNavigate,
  cases,
  deadlines,
  dashboardItems,
  onEditDeadline,
  onCompleteDeadline
}: {
  onNavigate: (view: ViewId) => void;
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  dashboardItems: DeadlineDashboardItem[];
  onEditDeadline: (deadline: DeadlineRecord) => void;
  onCompleteDeadline: (deadline: DeadlineRecord) => void;
}) {
  const criticalCount = dashboardItems.filter((item) => item.dashboardState === 'critical' || item.dashboardState === 'overdue').length;
  const dueSoonCount = dashboardItems.filter((item) => item.dashboardState === 'due_soon').length;

  return (
    <div className="space-y-6">
      <section className="industrial-hero">
        <div>
          <p className="industrial-kicker">Dashboard</p>
          <h1 className="industrial-title">Arbeitsstand</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="kritisch" value={String(criticalCount)} tone="danger" />
          <Metric label="48h" value={String(dueSoonCount)} tone="warning" />
          <Metric label="Fälle" value={String(cases.length)} />
          <Metric label="Fristen" value={String(deadlines.length)} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {modules.map((module) => (
          <DashboardCard
            key={module.id}
            {...module}
            disabled={module.status === 'planned'}
            statusText={module.status === 'planned' ? `In Entwicklung${module.plannedVersion ? ` · geplant ${module.plannedVersion}` : ''}` : undefined}
            onClick={() => {
              if (module.status === 'planned') return;
              onNavigate(module.id);
            }}
          />
        ))}
      </section>

      <DeadlineDashboardPanel items={dashboardItems} cases={cases} onEdit={onEditDeadline} onComplete={onCompleteDeadline} />
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warning' | 'danger' }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


function formatNoteDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return 'unbekannt';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateShort(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date);
}

type CaseExplorerSelection =
  | { type: 'overview' }
  | { type: 'note'; id: string }
  | { type: 'document'; id: string }
  | { type: 'process'; processType: CaseProcessType; id?: string }
  | { type: 'search'; id: string };

type CaseNodeTarget = {
  caseId: string;
  nodeType: CaseProcessType | 'note' | 'document' | 'deadline';
  nodeId?: string;
};

type ProtocolTextTarget = 'content' | 'nextSteps';

type InlineDeadlineDraft = {
  target: ProtocolTextTarget;
  title: string;
  dueAt: string;
  severity: DeadlineSeverity;
  legalBasis: string;
  description: string;
  markerIndex: number | null;
};

type InlineContactDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  query: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: string;
  category: ContactCategory;
  email: string;
  phone: string;
};

type InlineCaseLinkDraft = { target: ProtocolTextTarget; markerIndex: number; query: string };
type InlineLegalNormDraft = { target: ProtocolTextTarget; markerIndex: number; query: string };
type InlineRiskDraft = { target: ProtocolTextTarget; markerIndex: number; level: RiskLevelCommand; text: string };
type InlineOpenTaskDraft = { target: ProtocolTextTarget; markerIndex: number | null; title: string; description: string; severity: DeadlineSeverity };
type InlineConfidentialityDraft = { target: ProtocolTextTarget; markerIndex: number; level: ConfidentialCommandLevel };
type InlineAnonymizationDraft = { target: ProtocolTextTarget; markerIndex: number; label: string };

type CaseProcessType = 'prevention' | 'bem' | 'termination_hearing' | 'equalization';

type CaseProcessDraft = {
  processType: CaseProcessType;
  title: string;
  description: string;
  dueAt: string;
};

const caseProcessLabels: Record<CaseProcessType, string> = {
  prevention: 'Präventionsverfahren',
  bem: 'BEM-Verfahren',
  termination_hearing: 'Kündigungsanhörung',
  equalization: 'Gleichstellungsprozess'
};

function processTypeLabel(processType: CaseProcessType): string {
  return caseProcessLabels[processType];
}

function defaultCaseProcessDraft(processType: CaseProcessType): CaseProcessDraft {
  return {
    processType,
    title: processTypeLabel(processType),
    description: processType === 'prevention'
      ? 'Aus der Fallakte gestartetes Präventionsverfahren. Bitte Anlass und Gefährdung konkretisieren.'
      : `${processTypeLabel(processType)} aus der Fallakte vorgemerkt. Das Fachmodul übernimmt später die strukturierte Bearbeitung.`,
    dueAt: ''
  };
}

function formatProcessNodeSubtitle(processType: CaseProcessType, status?: string): string {
  return `${processTypeLabel(processType)}${status ? ` · ${status}` : ''}`;
}


type ProcessTemplateModalState = {
  process: PreventionProcessRecord;
  templates: TemplateRecord[];
  rendered?: RenderedTemplateResult;
  loading: boolean;
  error?: string;
  info?: string;
};

const preventionStatusOrder: PreventionStatus[] = [
  'zu_pruefen',
  'angefordert',
  'arbeitgeber_reagiert',
  'inklusionsamt_eingeschaltet',
  'massnahmen_in_klaerung',
  'massnahmen_vereinbart',
  'abgeschlossen',
  'blockiert_verweigert'
];

function preventionStatusReached(current: PreventionStatus, minimum: PreventionStatus): boolean {
  return preventionStatusOrder.indexOf(current) >= preventionStatusOrder.indexOf(minimum);
}

function canShowEmployerReactionSection(status: PreventionStatus): boolean {
  return preventionStatusReached(status, 'arbeitgeber_reagiert');
}

function canShowMeasureClarificationSection(status: PreventionStatus): boolean {
  return preventionStatusReached(status, 'massnahmen_in_klaerung') || status === 'blockiert_verweigert';
}

function canShowResultSection(status: PreventionStatus): boolean {
  return status === 'abgeschlossen' || status === 'blockiert_verweigert';
}

function sanitizeDownloadFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 110) || 'dokument';
}

function downloadRenderedTemplate(result: RenderedTemplateResult) {
  const content = `Betreff: ${result.subject}\n\n${result.body}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${sanitizeDownloadFileName(result.title || result.subject || 'SBV-Dokument')}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function templateTags(template: TemplateRecord): string[] {
  return ((template.tags ?? []) as string[]).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function isTemplateConnectedToPreventionStatus(template: TemplateRecord, status: PreventionStatus): boolean {
  if (template.category !== 'praevention') return false;
  const tags = templateTags(template);
  const text = `${template.title} ${template.description ?? ''} ${tags.join(' ')}`.toLowerCase();
  const hasProcessMatch = tags.length === 0
    || tags.some((tag) => ['massnahme:prevention', 'maßnahme:prevention', 'prozess:prevention', 'praevention', 'prävention', 'prevention'].includes(tag))
    || text.includes('prävention')
    || text.includes('präventionsverfahren');
  const statusTokens = [`status:${status}`, `praevention:${status}`, `prävention:${status}`, `prevention:${status}`, status];
  const hasStatusMatch = tags.length === 0 || statusTokens.some((token) => tags.includes(token) || text.includes(token.replaceAll('_', ' ')));
  return hasProcessMatch && hasStatusMatch;
}

function buildProcessTemplateValues(caseRecord: CaseRecord | undefined, process: PreventionProcessRecord): Record<string, string> {
  return {
    'fall.aktenzeichen': caseRecord?.caseNumber ?? '',
    'fall.name': caseRecord?.displayName ?? '',
    'fall.kurzbeschreibung': caseRecord?.summary ?? '',
    'praevention.status': statusLabel(process.status),
    'praevention.status.key': process.status,
    'praevention.gefaehrdung': process.hazardDescription ?? '',
    'praevention.schwierigkeit': process.difficultyType.replaceAll('_', ' '),
    'praevention.risiko': process.riskType.replaceAll('_', ' '),
    'praevention.personenstatus': process.personStatus.replaceAll('_', ' '),
    'praevention.angefordert_am': formatDateShort(process.requestedAt),
    'praevention.arbeitgeberfrist': formatDateShort(process.employerResponseDueAt),
    'praevention.arbeitgeberreaktion': process.employerRequestSummary ?? '',
    'praevention.massnahmen': process.measures ?? '',
    'praevention.ergebnis': process.result ?? '',
    'frist.datum': formatDateShort(process.employerResponseDueAt)
  };
}

type CaseToast = {
  id: number;
  variant: 'ok' | 'warning';
  text: string;
};

function CasesView({
  cases,
  contacts,
  target,
  onCreateCase,
  onCreateDeadline,
  onCreateContact,
  onCasesChanged,
  onTargetConsumed
}: {
  cases: CaseRecord[];
  contacts: ContactRecord[];
  target?: CaseNodeTarget | null;
  onCreateCase: (input: { caseNumber: string; displayName: string; category: CaseCategory; summary?: string }) => Promise<void>;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
  onCasesChanged: () => Promise<void>;
  onTargetConsumed?: () => void;
}) {
  const [caseNumber, setCaseNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<CaseCategory>('bem');
  const [summary, setSummary] = useState('');
  const [isCaseCreateModalOpen, setIsCaseCreateModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [caseFilter, setCaseFilter] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [notes, setNotes] = useState<CaseNoteRecord[]>([]);
  const [documents, setDocuments] = useState<CaseDocumentRecord[]>([]);
  const [caseLegalReferences, setCaseLegalReferences] = useState<CaseLegalReferenceRecord[]>([]);
  const [casePreventionProcesses, setCasePreventionProcesses] = useState<PreventionProcessRecord[]>([]);
  const [caseProcessDraft, setCaseProcessDraft] = useState<CaseProcessDraft | null>(null);
  const [processTemplateModal, setProcessTemplateModal] = useState<ProcessTemplateModalState | null>(null);
  const [selection, setSelection] = useState<CaseExplorerSelection>({ type: 'overview' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOnlySelectedCase, setSearchOnlySelectedCase] = useState(true);
  const [searchResults, setSearchResults] = useState<CaseSearchResult[]>([]);
  const [editingNote, setEditingNote] = useState<CaseNoteRecord | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDate, setNoteDate] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [noteType, setNoteType] = useState<CaseNoteType>('gespraech');
  const [participants, setParticipants] = useState('');
  const [content, setContent] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [containsHealthData, setContainsHealthData] = useState(true);
  const [confidentialLevel, setConfidentialLevel] = useState<ConfidentialLevel>('sensibel');
  const [linkedCaseIds, setLinkedCaseIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [noteError, setNoteError] = useState('');
  const [noteInfo, setNoteInfo] = useState('');
  const [inlineDeadlineDraft, setInlineDeadlineDraft] = useState<InlineDeadlineDraft | null>(null);
  const [inlineContactDraft, setInlineContactDraft] = useState<InlineContactDraft | null>(null);
  const [inlineCaseLinkDraft, setInlineCaseLinkDraft] = useState<InlineCaseLinkDraft | null>(null);
  const [inlineLegalNormDraft, setInlineLegalNormDraft] = useState<InlineLegalNormDraft | null>(null);
  const [inlineRiskDraft, setInlineRiskDraft] = useState<InlineRiskDraft | null>(null);
  const [inlineOpenTaskDraft, setInlineOpenTaskDraft] = useState<InlineOpenTaskDraft | null>(null);
  const [inlineConfidentialityDraft, setInlineConfidentialityDraft] = useState<InlineConfidentialityDraft | null>(null);
  const [inlineAnonymizationDraft, setInlineAnonymizationDraft] = useState<InlineAnonymizationDraft | null>(null);
  const [documentError, setDocumentError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [caseToast, setCaseToast] = useState<CaseToast | null>(null);
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();
  const [pendingCaseNodeTarget, setPendingCaseNodeTarget] = useState<CaseNodeTarget | null>(null);

  useEffect(() => {
    if (!target) return;
    setPendingCaseNodeTarget(target);
    setSelectedCaseId(target.caseId);
  }, [target]);

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId), [cases, selectedCaseId]);
  const filteredCases = useMemo(() => {
    const q = caseFilter.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((item) =>
      item.caseNumber.toLowerCase().includes(q)
      || item.displayName.toLowerCase().includes(q)
      || (item.summary ?? '').toLowerCase().includes(q)
      || item.category.toLowerCase().includes(q)
    );
  }, [cases, caseFilter]);

  const visibleCases = filteredCases;
  const selectedNote = selection.type === 'note' ? notes.find((note) => note.id === selection.id) : undefined;
  const selectedDocument = selection.type === 'document' ? documents.find((doc) => doc.id === selection.id) : undefined;
  const selectedSearchResult = selection.type === 'search' ? searchResults.find((result) => result.sourceId === selection.id) : undefined;

  function pushCaseToast(text: string, variant: 'ok' | 'warning' = 'ok') {
    const id = Date.now();
    setCaseToast({ id, text, variant });
    window.setTimeout(() => {
      setCaseToast((current: CaseToast | null) => current?.id === id ? null : current);
    }, 4200);
  }

  useEffect(() => {
    if (!selectedCaseId && cases.length) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  useEffect(() => {
    if (selectedCaseId && !editingNote) {
      setLinkedCaseIds([selectedCaseId]);
    }
  }, [selectedCaseId, editingNote]);


  useEffect(() => {
    function openCaseModalFromShortcut() {
      openCaseCreateModal();
    }

    function focusCaseSearchFromShortcut() {
      const target = document.querySelector<HTMLInputElement>('[data-global-search-target=\"cases\"]');
      target?.focus();
      target?.select();
    }

    window.addEventListener('gremia-sbv:create-case', openCaseModalFromShortcut);
    window.addEventListener('gremia-sbv:focus-search', focusCaseSearchFromShortcut);
    return () => {
      window.removeEventListener('gremia-sbv:create-case', openCaseModalFromShortcut);
      window.removeEventListener('gremia-sbv:focus-search', focusCaseSearchFromShortcut);
    };
  }, []);

  useEffect(() => {
    if (!noteInfo) return;
    pushCaseToast(noteInfo, 'ok');
    setNoteInfo('');
  }, [noteInfo]);

  useEffect(() => {
    if (!noteError) return;
    pushCaseToast(noteError, 'warning');
    setNoteError('');
  }, [noteError]);

  useEffect(() => {
    if (!documentError) return;
    pushCaseToast(documentError, 'warning');
    setDocumentError('');
  }, [documentError]);

  useEffect(() => {
    if (!searchError) return;
    pushCaseToast(searchError, 'warning');
    setSearchError('');
  }, [searchError]);

  useEffect(() => {
    if (!selectedCaseId) {
      setNotes([]);
      setDocuments([]);
      setCaseLegalReferences([]);
      setCasePreventionProcesses([]);
      return;
    }
    let active = true;
    async function loadCaseChildren() {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
        const [noteRows, docRows, legalRefRows, preventionRows] = await Promise.all([
          bridge.cases.listNotes(selectedCaseId),
          bridge.cases.listDocuments(selectedCaseId),
          bridge.knowledge?.listCaseReferences(selectedCaseId) ?? Promise.resolve([]),
          bridge.prevention?.list(selectedCaseId) ?? Promise.resolve([])
        ]);
        if (active) {
          setNotes(noteRows);
          setDocuments(docRows);
          setCaseLegalReferences(legalRefRows);
          setCasePreventionProcesses(preventionRows);
          if (pendingCaseNodeTarget?.caseId === selectedCaseId) {
            if (pendingCaseNodeTarget.nodeType === 'prevention') {
              setSelection({ type: 'process', processType: 'prevention', id: pendingCaseNodeTarget.nodeId });
            } else if (pendingCaseNodeTarget.nodeType === 'note' && pendingCaseNodeTarget.nodeId) {
              setSelection({ type: 'note', id: pendingCaseNodeTarget.nodeId });
            } else if (pendingCaseNodeTarget.nodeType === 'document' && pendingCaseNodeTarget.nodeId) {
              setSelection({ type: 'document', id: pendingCaseNodeTarget.nodeId });
            } else {
              setSelection({ type: 'overview' });
            }
            setPendingCaseNodeTarget(null);
            onTargetConsumed?.();
          } else {
            setSelection({ type: 'overview' });
          }
        }
      } catch (error) {
        if (active) setNoteError(error instanceof Error ? error.message : 'Fallakte konnte nicht geladen werden.');
      }
    }
    void loadCaseChildren();
    return () => { active = false; };
  }, [selectedCaseId]);

  async function reloadSelectedCaseChildren() {
    if (!selectedCaseId) return;
    const bridge = await waitForBridge();
    if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
    const [noteRows, docRows, legalRefRows, preventionRows] = await Promise.all([
      bridge.cases.listNotes(selectedCaseId),
      bridge.cases.listDocuments(selectedCaseId),
      bridge.knowledge?.listCaseReferences(selectedCaseId) ?? Promise.resolve([]),
      bridge.prevention?.list(selectedCaseId) ?? Promise.resolve([])
    ]);
    setNotes(noteRows);
    setDocuments(docRows);
    setCaseLegalReferences(legalRefRows);
    setCasePreventionProcesses(preventionRows);
  }

  async function updateCasePreventionProcess(processId: string, input: UpdatePreventionProcessInput) {
    setNoteError('');
    setNoteInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
      await bridge.prevention.update(processId, input);
      await reloadSelectedCaseChildren();
      setNoteInfo('Präventionsverfahren wurde aktualisiert.');
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Präventionsverfahren konnte nicht aktualisiert werden.');
    }
  }

  async function openProcessTemplateModal(process: PreventionProcessRecord) {
    setProcessTemplateModal({ process, templates: [], loading: true });
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      const rows = await bridge.templates.list({ category: 'praevention', limit: 500 });
      const templates = rows.filter((template: TemplateRecord) => isTemplateConnectedToPreventionStatus(template, process.status));
      setProcessTemplateModal({ process, templates, loading: false });
    } catch (error) {
      setProcessTemplateModal({ process, templates: [], loading: false, error: error instanceof Error ? error.message : 'Vorlagen konnten nicht geladen werden.' });
    }
  }

  async function renderAndDownloadProcessTemplate(template: TemplateRecord) {
    if (!processTemplateModal) return;
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      const defaultValues = await loadTemplateDefaultValues();
      const result = await (bridge.templates.render as unknown as (input: Record<string, unknown>) => Promise<RenderedTemplateResult>)({
        templateId: template.id,
        caseId: selectedCase?.id,
        sourceId: processTemplateModal.process.id,
        values: {
          ...defaultValues,
          ...buildProcessTemplateValues(selectedCase, processTemplateModal.process)
        },
        archive: true
      });
      downloadRenderedTemplate(result);
      setProcessTemplateModal((current) => current ? { ...current, rendered: result, info: 'Dokument wurde erzeugt, heruntergeladen und im Vorlagenverlauf archiviert.', error: undefined } : current);
    } catch (error) {
      setProcessTemplateModal((current) => current ? { ...current, error: error instanceof Error ? error.message : 'Dokument konnte nicht erzeugt werden.' } : current);
    }
  }


  function openCaseProcessDraft(processType: CaseProcessType) {
    if (!selectedCaseId) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    setCaseProcessDraft(defaultCaseProcessDraft(processType));
  }

  async function createCaseProcessFromDraft() {
    if (!selectedCase || !caseProcessDraft) return;
    setNoteError('');
    setNoteInfo('');
    try {
      const bridge = await waitForBridge();
      if (caseProcessDraft.processType === 'prevention') {
        if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
        const created = await bridge.prevention.create({
          caseId: selectedCase.id,
          hazardDescription: caseProcessDraft.description.trim() || `Präventionsverfahren aus Fallakte ${selectedCase.caseNumber} gestartet.`,
          employerResponseDueAt: caseProcessDraft.dueAt ? fromDateTimeLocalValue(caseProcessDraft.dueAt) : undefined,
          difficultyType: 'gesundheitlich_arbeitsplatzbezogen',
          riskType: 'ueberlastung',
          personStatus: 'unklar',
          contactIds: [],
          createDefaultDeadlines: true
        });
        setCaseProcessDraft(null);
        setSelection({ type: 'process', processType: 'prevention', id: created.id });
        setNoteInfo('Präventionsverfahren wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.');
        await reloadSelectedCaseChildren();
        await onCasesChanged();
        return;
      }

      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      await bridge.cases.createNote({
        caseId: selectedCase.id,
        caseIds: [selectedCase.id],
        title: `${caseProcessDraft.title} vorgemerkt`,
        noteDate: new Date().toISOString(),
        noteType: 'interne_notiz',
        participants: '',
        content: `${caseProcessDraft.title} wurde an dieser Fallakte als Fachmaßnahme vorgemerkt.

${caseProcessDraft.description}`,
        nextSteps: 'Fachmodul öffnen, sobald der strukturierte Workflow verfügbar ist.',
        containsHealthData: true,
        confidentialLevel: 'sensibel'
      });
      setCaseProcessDraft(null);
      setSelection({ type: 'process', processType: caseProcessDraft.processType });
      setNoteInfo(`${caseProcessDraft.title} wurde als fallbezogene Maßnahme vorgemerkt.`);
      await reloadSelectedCaseChildren();
      await onCasesChanged();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Maßnahme konnte nicht angelegt werden.');
    }
  }

  function resetNoteForm() {
    setEditingNote(null);
    setNoteTitle('');
    setNoteDate(toDateTimeLocalValue(new Date().toISOString()));
    setNoteType('gespraech');
    setParticipants('');
    setContent('');
    setNextSteps('');
    setContainsHealthData(true);
    setConfidentialLevel('sensibel');
    setLinkedCaseIds(selectedCaseId ? [selectedCaseId] : []);
    setInlineDeadlineDraft(null);
    setInlineContactDraft(null);
    setInlineCaseLinkDraft(null);
    setInlineLegalNormDraft(null);
    setInlineRiskDraft(null);
    setInlineOpenTaskDraft(null);
    setInlineConfidentialityDraft(null);
    setInlineAnonymizationDraft(null);
    setNoteError('');
    setNoteInfo('');
  }

  function startEditNote(note: CaseNoteRecord) {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteDate(toDateTimeLocalValue(note.noteDate));
    setNoteType(note.noteType);
    setParticipants(note.participants ?? '');
    setContent(note.content);
    setNextSteps(note.nextSteps ?? '');
    setContainsHealthData(note.containsHealthData);
    setConfidentialLevel(note.confidentialLevel);
    setLinkedCaseIds(note.caseIds?.length ? note.caseIds : (selectedCaseId ? [selectedCaseId] : []));
    setSelection({ type: 'note', id: note.id });
    setIsNoteModalOpen(true);
    setInlineDeadlineDraft(null);
    setInlineContactDraft(null);
    setInlineCaseLinkDraft(null);
    setInlineLegalNormDraft(null);
    setInlineRiskDraft(null);
    setInlineOpenTaskDraft(null);
    setInlineConfidentialityDraft(null);
    setInlineAnonymizationDraft(null);
    setNoteError('');
    setNoteInfo('');
  }


  function toggleLinkedCase(caseId: string, checked: boolean) {
    setLinkedCaseIds((current) => {
      const next = checked ? [...current, caseId] : current.filter((id) => id !== caseId);
      return [...new Set(next)];
    });
  }



  function hasOpenInlineOverlay(): boolean {
    return Boolean(
      inlineDeadlineDraft || inlineContactDraft || inlineCaseLinkDraft || inlineLegalNormDraft || inlineRiskDraft
      || inlineOpenTaskDraft || inlineConfidentialityDraft || inlineAnonymizationDraft
    );
  }

  function updateProtocolTarget(target: ProtocolTextTarget, updater: (current: string) => string) {
    if (target === 'content') setContent(updater);
    else setNextSteps(updater);
  }

  function replaceInlineCommand(target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken, replacement: string) {
    updateProtocolTarget(target, (current) => replaceCommandMarker(current, markerIndex, token, replacement));
  }

  function removeInlineCommand(target: ProtocolTextTarget, markerIndex: number, token: TextCommandToken) {
    updateProtocolTarget(target, (current) => removeCommandMarker(current, markerIndex, token));
  }

  function filterCasesForQuery(records: CaseRecord[], query: string): CaseRecord[] {
    const q = query.trim().toLowerCase();
    if (!q) return records.slice(0, 12);
    return records.filter((record) =>
      record.caseNumber.toLowerCase().includes(q)
      || record.displayName.toLowerCase().includes(q)
      || (record.summary ?? '').toLowerCase().includes(q)
      || record.category.toLowerCase().includes(q)
    ).slice(0, 12);
  }

  function filterNormsForQuery(norms: LegalNormSuggestion[], query: string): LegalNormSuggestion[] {
    const q = query.trim().toLowerCase();
    if (!q) return norms.slice(0, 12);
    return norms.filter((norm) =>
      norm.paragraph.toLowerCase().includes(q)
      || norm.title.toLowerCase().includes(q)
      || norm.source.toLowerCase().includes(q)
      || norm.shortText.toLowerCase().includes(q)
    ).slice(0, 12);
  }

  function openInlineCommand(target: ProtocolTextTarget, token: TextCommandToken, markerIndex: number) {
    if (token === '//') {
      setInlineDeadlineDraft({
        target,
        title: defaultDeadlineTitleForCase(selectedCase, noteTitle),
        dueAt: '',
        severity: 'important',
        legalBasis: '',
        description: target === 'content' ? 'Aus Protokolltext per // angelegt.' : 'Aus nächste Schritte per // angelegt.',
        markerIndex
      });
      return;
    }
    if (token === '@@') {
      openInlineContactDraft(target, markerIndex);
      return;
    }
    if (token === '##') {
      setInlineCaseLinkDraft({ target, markerIndex, query: '' });
      return;
    }
    if (token === '§§') {
      setInlineLegalNormDraft({ target, markerIndex, query: '' });
      return;
    }
    if (token === '!!') {
      setInlineRiskDraft({ target, markerIndex, level: 'high', text: '' });
      return;
    }
    if (token === '>>') {
      setInlineOpenTaskDraft({ target, markerIndex, title: '', description: '', severity: 'important' });
      return;
    }
    if (token === '^^') {
      setInlineConfidentialityDraft({ target, markerIndex, level: 'hoch_sensibel' });
      return;
    }
    if (token === '~~') {
      setInlineAnonymizationDraft({ target, markerIndex, label: 'Name' });
    }
  }

  function removeContactCommand(draft: InlineContactDraft) {
    const applyRemoval = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith('@@') ? draft.markerIndex : current.indexOf('@@');
      if (index < 0) return current;
      return replaceRange(current, index, 2, '').replace(/ {2,}/g, ' ');
    };

    if (draft.target === 'content') {
      setContent(applyRemoval);
    } else {
      setNextSteps(applyRemoval);
    }
  }

  function insertInlineContactText(draft: InlineContactDraft, contact: ContactRecord) {
    const replacement = formatContactReference(contact);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith('@@') ? draft.markerIndex : current.indexOf('@@');
      if (index < 0) return current;
      return replaceRange(current, index, 2, replacement);
    };

    if (draft.target === 'content') {
      setContent(applyReplacement);
    } else {
      setNextSteps(applyReplacement);
    }
  }

  function openInlineContactDraft(target: ProtocolTextTarget, markerIndex: number) {
    setInlineContactDraft({
      target,
      markerIndex,
      query: '',
      firstName: '',
      lastName: '',
      organization: '',
      role: '',
      category: 'sonstiges',
      email: '',
      phone: ''
    });
  }

  async function insertExistingContactFromProtocol(contact: ContactRecord) {
    if (!inlineContactDraft) return;
    insertInlineContactText(inlineContactDraft, contact);
    setInlineContactDraft(null);
    setNoteInfo(`Kontakt eingefügt: ${formatContactReference(contact)}`);
  }

  async function createAndInsertContactFromProtocol() {
    setNoteError('');
    setNoteInfo('');
    if (!inlineContactDraft) return;
    if (!inlineContactDraft.firstName.trim() || !inlineContactDraft.lastName.trim()) {
      setNoteError('Bitte Vorname und Nachname des Kontakts erfassen.');
      return;
    }

    try {
      const created = await onCreateContact({
        firstName: inlineContactDraft.firstName,
        lastName: inlineContactDraft.lastName,
        organization: inlineContactDraft.organization || undefined,
        role: inlineContactDraft.role || undefined,
        category: inlineContactDraft.category,
        email: inlineContactDraft.email || undefined,
        phone: inlineContactDraft.phone || undefined
      });
      insertInlineContactText(inlineContactDraft, created);
      setInlineContactDraft(null);
      setNoteInfo(`Kontakt angelegt und eingefügt: ${formatContactReference(created)}`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Kontakt konnte nicht angelegt werden.');
    }
  }

  function cancelInlineContactDraft() {
    if (inlineContactDraft) removeContactCommand(inlineContactDraft);
    setInlineContactDraft(null);
  }

  function removeSlashCommand(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const applyRemoval = (current: string) => {
      const index = current.slice(draft.markerIndex ?? 0).startsWith('//') ? draft.markerIndex ?? 0 : current.indexOf('//');
      if (index < 0) return current;
      return replaceRange(current, index, 2, '').replace(/ {2,}/g, ' ');
    };

    if (draft.target === 'content') {
      setContent(applyRemoval);
    } else {
      setNextSteps(applyRemoval);
    }
  }

  function insertInlineDeadlineText(draft: InlineDeadlineDraft) {
    if (draft.markerIndex === null) return;
    const replacement = buildInlineDeadlineText(draft);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex ?? 0).startsWith('//') ? draft.markerIndex ?? 0 : current.indexOf('//');
      if (index < 0) return current;
      return replaceRange(current, index, 2, replacement);
    };

    if (draft.target === 'content') {
      setContent(applyReplacement);
    } else {
      setNextSteps(applyReplacement);
    }
  }

  function handleProtocolTextChange(target: ProtocolTextTarget, value: string) {
    setNoteInfo('');
    const previousValue = target === 'content' ? content : nextSteps;
    if (target === 'content') setContent(value);
    else setNextSteps(value);

    if (hasOpenInlineOverlay()) return;
    const command = findFirstTextCommand(value);
    if (!command) return;

    const wasAlreadyPresent = previousValue.includes(command.token);
    if (!wasAlreadyPresent) {
      openInlineCommand(target, command.token, command.index);
    }
  }

  async function insertCaseReferenceFromProtocol(record: CaseRecord) {
    if (!inlineCaseLinkDraft) return;
    setLinkedCaseIds((current) => [...new Set([...current, record.id])]);
    replaceInlineCommand(inlineCaseLinkDraft.target, inlineCaseLinkDraft.markerIndex, '##', formatCaseReferenceText(record.caseNumber, record.displayName));
    setInlineCaseLinkDraft(null);
    setNoteInfo(`Fallbezug ergänzt: ${record.caseNumber}`);
  }

  function cancelInlineCaseLinkDraft() {
    if (inlineCaseLinkDraft) removeInlineCommand(inlineCaseLinkDraft.target, inlineCaseLinkDraft.markerIndex, '##');
    setInlineCaseLinkDraft(null);
  }

  async function insertLegalNormFromProtocol(norm: LegalNormSuggestion | LegalNormRecord) {
    if (!inlineLegalNormDraft) return;
    replaceInlineCommand(inlineLegalNormDraft.target, inlineLegalNormDraft.markerIndex, '§§', formatLegalNormText(norm));
    if (selectedCaseId) {
      try {
        const bridge = await waitForBridge();
        if (bridge?.knowledge) {
          await bridge.knowledge.linkNormToCase({ caseId: selectedCaseId, legalNormId: norm.id, note: 'Aus Protokoll mit §§ verknüpft.' });
          setCaseLegalReferences(await bridge.knowledge.listCaseReferences(selectedCaseId));
        }
      } catch {
        // Der Text bleibt eingefügt; der Fallbezug kann später im Wissensmodul nachgezogen werden.
      }
    }
    setInlineLegalNormDraft(null);
    setNoteInfo(`Rechtsnorm eingefügt: ${norm.paragraph}`);
  }

  function cancelInlineLegalNormDraft() {
    if (inlineLegalNormDraft) removeInlineCommand(inlineLegalNormDraft.target, inlineLegalNormDraft.markerIndex, '§§');
    setInlineLegalNormDraft(null);
  }

  async function insertRiskFromProtocol() {
    if (!inlineRiskDraft) return;
    replaceInlineCommand(inlineRiskDraft.target, inlineRiskDraft.markerIndex, '!!', formatRiskText(inlineRiskDraft.level, inlineRiskDraft.text));
    if (inlineRiskDraft.level === 'critical') setConfidentialLevel('hoch_sensibel');
    else if (inlineRiskDraft.level === 'high' && confidentialLevel === 'normal') setConfidentialLevel('sensibel');
    setInlineRiskDraft(null);
    setNoteInfo('Risiko im Protokoll markiert. Fall-Risikostufe wird mit dem Protokoll nachvollziehbar dokumentiert.');
  }

  function cancelInlineRiskDraft() {
    if (inlineRiskDraft) removeInlineCommand(inlineRiskDraft.target, inlineRiskDraft.markerIndex, '!!');
    setInlineRiskDraft(null);
  }

  async function createOpenTaskFromProtocol() {
    setNoteError('');
    setNoteInfo('');
    if (!selectedCaseId || !selectedCase) {
      setNoteError('Bitte zuerst eine Fallakte auswählen. Aufgaben werden immer mit dem aktuellen Fall verbunden.');
      return;
    }
    if (!inlineOpenTaskDraft || !inlineOpenTaskDraft.title.trim()) {
      setNoteError('Bitte einen Aufgabentitel erfassen.');
      return;
    }
    try {
      const placeholderDueAt = new Date('9999-12-31T23:59:59.000Z').toISOString();
      await onCreateDeadline({
        caseId: selectedCaseId,
        processType: 'case',
        deadlineType: 'follow_up',
        title: inlineOpenTaskDraft.title.trim(),
        confidentialTitle: `Aufgabe ${selectedCase.caseNumber}`,
        description: `${inlineOpenTaskDraft.description.trim() || 'Offene Aufgabe ohne konkretes Ablaufdatum.'} Hinweis: technisch mit Platzhalterdatum gespeichert, aber als offene Aufgabe ohne Datum gemeint.`,
        dueAt: placeholderDueAt,
        severity: inlineOpenTaskDraft.severity,
        sourceEvent: noteTitle.trim() ? `Protokoll: ${noteTitle.trim()}` : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: 'manual',
        isLegalDeadline: false,
        isUserEditable: true,
        warningThresholdHours: 999999,
        criticalThresholdHours: 999998
      });
      if (inlineOpenTaskDraft.markerIndex !== null) {
        replaceInlineCommand(inlineOpenTaskDraft.target, inlineOpenTaskDraft.markerIndex, '>>', formatOpenTaskText(inlineOpenTaskDraft.title));
      }
      setInlineOpenTaskDraft(null);
      setNoteInfo(`Offene Aufgabe wurde mit Fall ${selectedCase.caseNumber} verbunden.`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Offene Aufgabe konnte nicht angelegt werden.');
    }
  }

  function cancelInlineOpenTaskDraft() {
    if (inlineOpenTaskDraft?.markerIndex !== null && inlineOpenTaskDraft) removeInlineCommand(inlineOpenTaskDraft.target, inlineOpenTaskDraft.markerIndex, '>>');
    setInlineOpenTaskDraft(null);
  }

  function applyConfidentialityFromProtocol() {
    if (!inlineConfidentialityDraft) return;
    setConfidentialLevel(inlineConfidentialityDraft.level);
    replaceInlineCommand(inlineConfidentialityDraft.target, inlineConfidentialityDraft.markerIndex, '^^', formatConfidentialityText(inlineConfidentialityDraft.level));
    setInlineConfidentialityDraft(null);
    setNoteInfo('Vertraulichkeitsstufe der Notiz wurde angepasst.');
  }

  function cancelInlineConfidentialityDraft() {
    if (inlineConfidentialityDraft) removeInlineCommand(inlineConfidentialityDraft.target, inlineConfidentialityDraft.markerIndex, '^^');
    setInlineConfidentialityDraft(null);
  }

  function applyAnonymizationMarkerFromProtocol() {
    if (!inlineAnonymizationDraft) return;
    replaceInlineCommand(inlineAnonymizationDraft.target, inlineAnonymizationDraft.markerIndex, '~~', formatAnonymizationMarkerText(inlineAnonymizationDraft.label));
    setInlineAnonymizationDraft(null);
    setNoteInfo('Anonymisierungsvormerkung im Protokoll gesetzt.');
  }

  function cancelInlineAnonymizationDraft() {
    if (inlineAnonymizationDraft) removeInlineCommand(inlineAnonymizationDraft.target, inlineAnonymizationDraft.markerIndex, '~~');
    setInlineAnonymizationDraft(null);
  }

  async function createInlineDeadlineFromProtocol() {
    setNoteError('');
    setNoteInfo('');

    if (!selectedCaseId || !selectedCase) {
      setNoteError('Bitte zuerst eine Fallakte auswählen. Inline-Fristen werden immer mit dem aktuellen Fall verbunden.');
      return;
    }
    if (!inlineDeadlineDraft) return;
    if (!inlineDeadlineDraft.title.trim() || !inlineDeadlineDraft.dueAt) {
      setNoteError('Bitte Titel und Ablaufdatum der Frist erfassen.');
      return;
    }

    try {
      await onCreateDeadline({
        caseId: selectedCaseId,
        processType: 'case',
        deadlineType: 'follow_up',
        title: inlineDeadlineDraft.title.trim(),
        confidentialTitle: `Frist ${selectedCase.caseNumber}`,
        description: inlineDeadlineDraft.description.trim() || `Aus Protokolltext zum Fall ${selectedCase.caseNumber} angelegt.`,
        dueAt: fromDateTimeLocalValue(inlineDeadlineDraft.dueAt),
        severity: inlineDeadlineDraft.severity,
        legalBasis: inlineDeadlineDraft.legalBasis.trim() || undefined,
        sourceEvent: noteTitle.trim() ? `Protokoll: ${noteTitle.trim()}` : `Protokoll im Fall ${selectedCase.caseNumber}`,
        calculationMode: 'manual',
        isLegalDeadline: false,
        isUserEditable: true
      });
      const shouldInsertDeadlineText = inlineDeadlineDraft.markerIndex !== null;
      insertInlineDeadlineText(inlineDeadlineDraft);
      setInlineDeadlineDraft(null);
      setNoteInfo(shouldInsertDeadlineText
        ? `Frist wurde mit Fall ${selectedCase.caseNumber} angelegt und im Protokolltext vermerkt.`
        : `Frist wurde mit Fall ${selectedCase.caseNumber} angelegt.`);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Inline-Frist konnte nicht angelegt werden.');
    }
  }

  function cancelInlineDeadlineDraft() {
    if (inlineDeadlineDraft) removeSlashCommand(inlineDeadlineDraft);
    setInlineDeadlineDraft(null);
  }

  function openCaseDeadlineDraft() {
    setNoteError('');
    setNoteInfo('');
    if (!selectedCaseId || !selectedCase) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    setInlineDeadlineDraft({
      target: 'nextSteps',
      title: defaultDeadlineTitleForCase(selectedCase, noteTitle),
      dueAt: '',
      severity: 'important',
      legalBasis: '',
      description: `Direkt aus Fallakte ${selectedCase.caseNumber} angelegt.`,
      markerIndex: null
    });
  }

  function openCaseCreateModal() {
    setError('');
    setIsCaseCreateModalOpen(true);
  }

  function cancelCaseCreateModal() {
    setIsCaseCreateModalOpen(false);
    setError('');
  }

  function openNewNoteModal() {
    if (!selectedCaseId) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    resetNoteForm();
    setLinkedCaseIds([selectedCaseId]);
    setIsNoteModalOpen(true);
  }

  function cancelNoteModal() {
    setIsNoteModalOpen(false);
    resetNoteForm();
  }

  async function addCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!caseNumber.trim() || !displayName.trim()) {
      setError('Bitte Aktenzeichen und Namen/Pseudonym erfassen.');
      return;
    }

    try {
      await onCreateCase({ caseNumber: caseNumber.trim(), displayName: displayName.trim(), category, summary: summary.trim() || undefined });
      setCaseNumber('');
      setDisplayName('');
      setSummary('');
      setIsCaseCreateModalOpen(false);
      await onCasesChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fall konnte nicht angelegt werden.');
    }
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNoteError('');
    setNoteInfo('');
    if (!selectedCaseId) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    if (!noteTitle.trim() || !content.trim()) {
      setNoteError('Bitte Titel und Inhalt erfassen.');
      return;
    }
    const normalizedLinkedCaseIds = [...new Set([selectedCaseId, ...linkedCaseIds].filter(Boolean))];
    if (!normalizedLinkedCaseIds.length) {
      setNoteError('Bitte mindestens eine Fallakte als Bezug auswählen.');
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      const payload = {
        caseId: selectedCaseId,
        caseIds: normalizedLinkedCaseIds,
        title: noteTitle.trim(),
        noteDate: fromDateTimeLocalValue(noteDate),
        noteType,
        participants: participants.trim() || undefined,
        content: content.trim(),
        nextSteps: nextSteps.trim() || undefined,
        containsHealthData,
        confidentialLevel
      };
      const saved = editingNote
        ? await bridge.cases.updateNote(editingNote.id, payload)
        : await bridge.cases.createNote(payload);
      resetNoteForm();
      setIsNoteModalOpen(false);
      await reloadSelectedCaseChildren();
      setSelection({ type: 'note', id: saved.id });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Gesprächsnotiz konnte nicht gespeichert werden.');
    }
  }

  async function deleteNote(note: CaseNoteRecord) {
    setNoteError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      await bridge.cases.deleteNote(note.id);
      if (editingNote?.id === note.id) resetNoteForm();
      await reloadSelectedCaseChildren();
      setSelection({ type: 'overview' });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Gesprächsnotiz konnte nicht gelöscht werden.');
    }
  }

  async function importDocuments() {
    setDocumentError('');
    if (!selectedCaseId) {
      setDocumentError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      const imported = await bridge.cases.selectAndImportDocuments(selectedCaseId, true);
      await reloadSelectedCaseChildren();
      if (imported.length) setSelection({ type: 'document', id: imported[0].id });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'Dokument konnte nicht importiert werden.');
    }
  }

  async function openDocument(document: CaseDocumentRecord) {
    setDocumentError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      await bridge.cases.openDocument(document.id);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'Dokument konnte nicht geöffnet werden.');
    }
  }

  async function exportDocument(document: CaseDocumentRecord) {
    setDocumentError('');
    const scan = scanSensitiveExportText(`${document.filename} ${selectedCase?.caseNumber ?? ''} ${selectedCase?.displayName ?? ''}`, {
      context: 'Dokumentenexport',
      target: document.filename
    });
    const confirmed = await confirmDialog({
      variant: 'warning',
      title: 'Dokument exportieren?',
      message: buildExportWarningMessage(scan),
      confirmLabel: 'Exportieren',
      cancelLabel: 'Abbrechen'
    });
    if (!confirmed) return;
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      await bridge.cases.exportDocument(document.id, document.filename);
      announce('Dokument wurde exportiert.', 'polite');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Dokument konnte nicht exportiert werden.';
      setDocumentError(message);
      announce(message, 'assertive');
    }
  }

  async function deleteDocument(document: CaseDocumentRecord) {
    setDocumentError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      await bridge.cases.deleteDocument(document.id);
      await reloadSelectedCaseChildren();
      setSelection({ type: 'overview' });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'Dokument konnte nicht gelöscht werden.');
    }
  }

  async function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSearchError('');
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      const results = await bridge.cases.search({
        query: searchQuery,
        caseId: searchOnlySelectedCase ? selectedCaseId || undefined : undefined,
        limit: 80
      });
      setSearchResults(results);
      if (results.length) setSelection({ type: 'search', id: results[0].sourceId });
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Volltextsuche konnte nicht ausgeführt werden.');
    }
  }

  return (
    <>
      {caseToast && (
        <div className={`case-toast case-toast-${caseToast.variant}`} role="status" aria-live="assertive">
          {caseToast.variant === "warning" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{caseToast.text}</span>
        </div>
      )}
      {processTemplateModal && (
        <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
          <section className="industrial-modal process-template-modal">
            <div className="industrial-panel-header compact">
              <div>
                <p className="industrial-kicker">Dokumente zur Maßnahme</p>
                <h2>{processTypeLabel('prevention')} · {statusLabel(processTemplateModal.process.status)}</h2>
                <p>Gezeigt werden Vorlagen der Maßnahmeart Prävention, die mit dem aktuellen Status verbunden sind.</p>
              </div>
              <button type="button" className="industrial-secondary-button" onClick={() => setProcessTemplateModal(null)}>Schließen</button>
            </div>
            {processTemplateModal.loading && <div className="industrial-empty">Vorlagen werden geladen …</div>}
            {processTemplateModal.error && <div className="industrial-message industrial-message-warning">{processTemplateModal.error}</div>}
            {processTemplateModal.info && <div className="industrial-message industrial-message-ok">{processTemplateModal.info}</div>}
            {!processTemplateModal.loading && !processTemplateModal.templates.length && !processTemplateModal.error && (
              <div className="process-template-empty">
                <p>Für diesen Status ist noch keine Vorlage hinterlegt.</p>
                <div className="process-template-hint">
                  <span>Benötigte Tags</span>
                  <code>massnahme:prevention</code>
                  <code>{`status:${processTemplateModal.process.status}`}</code>
                </div>
                <p className="process-template-empty-note">Lege die Vorlage im Vorlagenmodul an und verbinde sie mit Maßnahmeart und Status. Danach erscheint sie hier automatisch.</p>
              </div>
            )}
            <div className="process-template-list">
              {processTemplateModal.templates.map((template) => (
                <article key={template.id} className="process-template-card">
                  <div>
                    <strong>{template.title}</strong>
                    <p>{template.description}</p>
                    <span>{template.legalBasis.join(', ') || 'ohne Normbezug'}</span>
                  </div>
                  <button type="button" className="industrial-button" onClick={() => void renderAndDownloadProcessTemplate(template)}><Download className="h-4 w-4" />Download</button>
                </article>
              ))}
            </div>
            {processTemplateModal.rendered && (
              <div className="industrial-subpanel mt-4">
                <h4>Zuletzt erzeugt</h4>
                {processTemplateModal.rendered.unresolvedPlaceholders.length > 0 && <div className="industrial-message industrial-message-warning mb-3">Offene Platzhalter: {processTemplateModal.rendered.unresolvedPlaceholders.join(', ')}</div>}
                <p className="industrial-meta"><strong>Betreff:</strong> {processTemplateModal.rendered.subject}</p>
                <textarea className="industrial-output-area" value={processTemplateModal.rendered.body} readOnly />
              </div>
            )}
          </section>
        </div>
      )}
      <section className="industrial-panel case-register-panel compact">
        <div className="case-register-toolbar compact">
          <div className="case-register-meta">
            <p className="industrial-kicker">Fallliste</p>
            <strong>{filteredCases.length} Fälle</strong>
          </div>
          <div className="case-register-actions">
            <input className="industrial-input" data-global-search-target="cases" value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)} placeholder="Fälle filtern nach Aktenzeichen, Name, Kurzbeschreibung …" />
            <button type="button" className="industrial-button" onClick={openCaseCreateModal}><Plus className="h-4 w-4" />Fallakte</button>
          </div>
        </div>
        <div className="industrial-table-shell case-register-table-shell">
          <table className="industrial-table case-register-table">
            <thead><tr><th>Aktenzeichen</th><th>Name / Pseudonym</th><th>Kategorie</th><th>Status</th><th>Kurzbeschreibung</th></tr></thead>
            <tbody>
              {visibleCases.map((record) => (
                <tr key={record.id} className={record.id === selectedCaseId ? 'selected' : ''} onClick={() => setSelectedCaseId(record.id)}>
                  <td><strong>{record.caseNumber}</strong></td>
                  <td>{record.displayName}</td>
                  <td>{record.category}</td>
                  <td>{record.status}</td>
                  <td>{record.summary ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleCases.length && <div className="industrial-empty">Keine passenden Fälle.</div>}
        </div>
      </section>

      <section className="case-workbench">
        <aside className="industrial-panel case-tree-panel">
          <p className="industrial-kicker">Fallakte</p>
          <h2>{selectedCase?.caseNumber ?? 'Keine Auswahl'}</h2>
          <p className="industrial-meta">{selectedCase?.displayName ?? 'Bitte oben einen Fall auswählen.'}</p>
          <div className="case-tree-group process-drop-zone">
            <div className="case-tree-group-title"><Workflow className="h-4 w-4" /> Maßnahmen <span>{casePreventionProcesses.length}</span></div>
            {casePreventionProcesses.map((process) => (
              <button key={process.id} type="button" className={`case-tree-node ${selection.type === 'process' && selection.id === process.id ? 'active' : ''}`} onClick={() => setSelection({ type: 'process', processType: 'prevention', id: process.id })}>
                <span>Prävention</span><small>{formatProcessNodeSubtitle('prevention', process.status)}</small>
              </button>
            ))}
            {!casePreventionProcesses.length && <p className="case-tree-empty">Noch keine Maßnahme in dieser Akte.</p>}
          </div>
          <button type="button" className={`case-tree-node ${selection.type === 'overview' ? 'active' : ''}`} onClick={() => setSelection({ type: 'overview' })}>Übersicht</button>
          <div className="case-tree-group">
            <div className="case-tree-group-title"><MessageSquare className="h-4 w-4" /> Notizen & Protokolle <span>{notes.length}</span></div>
            {notes.map((note) => (
              <button key={note.id} type="button" className={`case-tree-node ${selection.type === 'note' && selection.id === note.id ? 'active' : ''}`} onClick={() => setSelection({ type: 'note', id: note.id })}>
                <span>{note.title}</span><small>{formatNoteDate(note.noteDate)} · {(note.caseNumbers ?? []).join(', ')}</small>
              </button>
            ))}
          </div>
          <div className="case-tree-group">
            <div className="case-tree-group-title"><FileText className="h-4 w-4" /> Dokumente <span>{documents.length}</span></div>
            {documents.map((document) => (
              <button key={document.id} type="button" className={`case-tree-node ${selection.type === 'document' && selection.id === document.id ? 'active' : ''}`} onClick={() => setSelection({ type: 'document', id: document.id })}>
                <span>{document.displayTitle}</span><small>{formatBytes(document.sizeBytes)}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="industrial-panel case-detail-panel">
          <form onSubmit={runSearch} className="knowledge-search-bar">
            <Search className="h-4 w-4 text-yellow-300" />
            <input className="industrial-input" data-global-search-target="case-fulltext" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Volltextsuche in Notizen, Protokollen und Dokumenten …" />
            <label className="industrial-checkbox-row compact"><input type="checkbox" checked={searchOnlySelectedCase} onChange={(event) => setSearchOnlySelectedCase(event.target.checked)} /><span>nur diese Fallakte</span></label>
            <button type="submit" className="industrial-button">Suchen</button>
          </form>
          {!!searchResults.length && (
            <div className="case-search-results">
              {searchResults.map((result) => (
                <button key={`${result.sourceType}-${result.sourceId}`} type="button" className="case-search-result" onClick={() => setSelection({ type: 'search', id: result.sourceId })}>
                  <span>{result.sourceType === 'note' ? 'Notiz' : 'Dokument'} · {(result.caseNumbers?.length ? result.caseNumbers.join(', ') : result.caseNumber)}</span>
                  <strong>{result.title}</strong>
                  <p>{result.excerpt}</p>
                </button>
              ))}
            </div>
          )}

          {selection.type === 'overview' && (
            <div className="case-detail-content">
              <h2>{selectedCase ? `${selectedCase.caseNumber} · ${selectedCase.displayName}` : 'Keine Fallakte ausgewählt'}</h2>
              <p>{selectedCase?.summary ?? 'Keine Kurzbeschreibung erfasst.'}</p>
              <div className="case-detail-metrics"><Metric label="Notizen" value={String(notes.length)} /><Metric label="Dokumente" value={String(documents.length)} /><Metric label="Rechtsbezüge" value={String(caseLegalReferences.length)} /><Metric label="Maßnahmen" value={String(casePreventionProcesses.length)} /><Metric label="Kategorie" value={selectedCase?.category ?? '—'} /></div>
              {selectedCase && (() => {
                const action = resolveContextualTemplateAction({ sourceType: 'case', title: 'Fallübersicht' });
                return action ? <div className="contextual-template-actions"><ContextualTemplateButton action={action} caseId={selectedCase.id} values={{ 'fall.aktenzeichen': selectedCase.caseNumber, 'fall.name': selectedCase.displayName, 'fall.kurzbeschreibung': selectedCase.summary ?? '' }} /></div> : null;
              })()}
            </div>
          )}

          {selection.type === 'process' && (
            <article className="case-detail-content">
              {selection.processType === 'prevention' && selection.id ? (
                (() => {
                  const process = casePreventionProcesses.find((item) => item.id === selection.id);
                  return process ? <div className="case-detail-inline-form">
                    <div className="case-process-header">
                      <div className="case-process-header-main">
                        <div className="case-process-title-row">
                          <span className="industrial-badge">Maßnahme</span>
                          <button type="button" className="case-process-document-link" onClick={() => void openProcessTemplateModal(process)}><FileText className="h-3.5 w-3.5" />Dokumente</button>
                        </div>
                        <h2>{processTypeLabel(selection.processType)}</h2>
                      </div>
                      <div className="case-process-badges" aria-label="Statusübersicht">
                        <span className="case-process-badge"><strong>Status</strong>{statusLabel(process.status)}</span>
                        <span className="case-process-badge"><strong>Risiko</strong>{process.riskType.replaceAll('_', ' ')}</span>
                        <span className="case-process-badge"><strong>Person</strong>{process.personStatus}</span>
                      </div>
                    </div>
                    <div className="prevention-status-sections">
                      <section className="prevention-status-section">
                        <header><span>1</span><strong>Prüfung und Ausgangslage</strong></header>
                        <div className="industrial-form-grid">
                          <label><span>Status</span><select value={process.status} onChange={(event) => void updateCasePreventionProcess(process.id, { status: event.target.value as PreventionStatus })}><option value="zu_pruefen">zu prüfen</option><option value="angefordert">angefordert</option><option value="arbeitgeber_reagiert">Arbeitgeber reagiert</option><option value="inklusionsamt_eingeschaltet">Inklusionsamt eingeschaltet</option><option value="massnahmen_in_klaerung">Maßnahmen in Klärung</option><option value="massnahmen_vereinbart">Maßnahmen vereinbart</option><option value="abgeschlossen">abgeschlossen</option><option value="blockiert_verweigert">blockiert / verweigert</option></select></label>
                          <label><span>Schwierigkeit</span><select value={process.difficultyType} onChange={(event) => void updateCasePreventionProcess(process.id, { difficultyType: event.target.value as PreventionDifficultyType })}>{preventionDifficultyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                          <label><span>Risiko</span><select value={process.riskType} onChange={(event) => void updateCasePreventionProcess(process.id, { riskType: event.target.value as PreventionRiskType })}>{preventionRiskOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                          <label><span>Status Person</span><select value={process.personStatus} onChange={(event) => void updateCasePreventionProcess(process.id, { personStatus: event.target.value as PreventionProcessRecord['personStatus'] })}><option value="unklar">unklar</option><option value="schwerbehindert">schwerbehindert</option><option value="gleichgestellt">gleichgestellt</option><option value="antrag_laeuft">Antrag läuft</option></select></label>
                        </div>
                        <label><span>Gefährdung / Anlass</span><textarea defaultValue={process.hazardDescription ?? ''} onBlur={(event) => void updateCasePreventionProcess(process.id, { hazardDescription: event.target.value })} /></label>
                      </section>

                      {preventionStatusReached(process.status, 'angefordert') && (
                        <section className="prevention-status-section">
                          <header><span>2</span><strong>Anforderung an den Arbeitgeber</strong></header>
                          <div className="industrial-form-grid">
                            <label><span>Arbeitgeber angefordert am</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.requestedAt)} onBlur={(event) => void updateCasePreventionProcess(process.id, { requestedAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : undefined })} /></label>
                            <label><span>Frist Arbeitgeberreaktion</span><input type="datetime-local" defaultValue={toDateTimeLocalValue(process.employerResponseDueAt)} onBlur={(event) => void updateCasePreventionProcess(process.id, { employerResponseDueAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : undefined })} /></label>
                          </div>
                        </section>
                      )}

                      {canShowEmployerReactionSection(process.status) && (
                        <section className="prevention-status-section">
                          <header><span>3</span><strong>Reaktion des Arbeitgebers</strong></header>
                          <label><span>Arbeitgeberreaktion / Stand</span><textarea defaultValue={process.employerRequestSummary ?? ''} onBlur={(event) => void updateCasePreventionProcess(process.id, { employerRequestSummary: event.target.value })} /></label>
                        </section>
                      )}

                      {canShowMeasureClarificationSection(process.status) && (
                        <section className="prevention-status-section">
                          <header><span>4</span><strong>Maßnahmenklärung und Umsetzung</strong></header>
                          <label><span>Maßnahmen</span><textarea defaultValue={process.measures ?? ''} onBlur={(event) => void updateCasePreventionProcess(process.id, { measures: event.target.value })} /></label>
                        </section>
                      )}

                      {canShowResultSection(process.status) && (
                        <section className="prevention-status-section">
                          <header><span>5</span><strong>Ergebnis / Abschluss</strong></header>
                          <label><span>Ergebnis / Abschluss</span><textarea defaultValue={process.result ?? ''} onBlur={(event) => void updateCasePreventionProcess(process.id, { result: event.target.value })} /></label>
                        </section>
                      )}
                    </div>
                    <p className="industrial-meta">Abschnitte werden erst sichtbar, wenn der Status fachlich erreicht ist. Eine Arbeitgeberreaktion wird deshalb erst nach dokumentierter Anforderung geführt.</p>
                  </div> : <p className="industrial-meta">Präventionsverfahren nicht gefunden.</p>;
                })()
              ) : (
                <p className="industrial-meta">Dieses Fachmodul ist noch nicht vollständig umgesetzt. Die Maßnahme wurde als fallbezogene Notiz vorgemerkt und erscheint in der Fallhistorie.</p>
              )}
            </article>
          )}

          {selectedNote && (
            <article className="case-detail-content">
              <div className="case-note-card-header"><span className="industrial-badge">{selectedNote.noteType}</span><time>{formatNoteDate(selectedNote.noteDate)}</time></div>
              <h2>{selectedNote.title}</h2>
              {selectedNote.participants && <p className="industrial-meta">Beteiligte: {selectedNote.participants}</p>}
              {!!selectedNote.caseNumbers?.length && <p className="industrial-meta">Fallbezüge: {selectedNote.caseNumbers.join(', ')}</p>}
              <p className="case-note-content">{selectedNote.content}</p>
              {selectedNote.nextSteps && <p className="case-note-next"><strong>Nächste Schritte:</strong> {selectedNote.nextSteps}</p>}
              <div className="industrial-card-actions"><button type="button" className="industrial-secondary-button" onClick={() => startEditNote(selectedNote)}>Bearbeiten</button><button type="button" className="industrial-secondary-button" onClick={() => void deleteNote(selectedNote)}><Trash2 className="h-4 w-4" /> Löschen</button></div>
            </article>
          )}

          {selectedDocument && (
            <article className="case-detail-content">
              <div className="case-note-card-header"><span className="industrial-badge">Dokument</span><time>{formatNoteDate(selectedDocument.createdAt)}</time></div>
              <h2>{selectedDocument.displayTitle}</h2>
              <p className="industrial-meta">{selectedDocument.filename} · {selectedDocument.mimeType ?? 'Datei'} · {formatBytes(selectedDocument.sizeBytes)}</p>
              <p className="industrial-meta">SHA-256: {selectedDocument.sha256}</p>
              {selectedDocument.extractedText ? <p className="case-note-content">{selectedDocument.extractedText.slice(0, 2000)}</p> : <p className="industrial-empty">Für dieses Dokument wurde kein lesbarer Volltext extrahiert. Dateiname und Metadaten sind trotzdem suchbar.</p>}
              <div className="industrial-message industrial-message-warning">Beim Öffnen oder Exportieren entsteht temporär bzw. bewusst eine Klartextkopie außerhalb des verschlüsselten Dokumentenspeichers.</div>
              <div className="industrial-card-actions"><button type="button" className="industrial-secondary-button" onClick={() => void openDocument(selectedDocument)}><FileText className="h-4 w-4" /> Öffnen</button><button type="button" className="industrial-secondary-button" onClick={() => void exportDocument(selectedDocument)}>Exportieren</button><button type="button" className="industrial-secondary-button" onClick={() => void deleteDocument(selectedDocument)}><Trash2 className="h-4 w-4" /> Löschen</button></div>
            </article>
          )}

          {selectedSearchResult && !selectedNote && !selectedDocument && (
            <article className="case-detail-content"><h2>{selectedSearchResult.title}</h2><p>{selectedSearchResult.excerpt}</p><button type="button" className="industrial-secondary-button" onClick={() => setSelectedCaseId(selectedSearchResult.caseId)}>Fallakte öffnen</button></article>
          )}

          <footer className="case-workbench-footer" aria-label="Neue Akteneinträge">
            <button type="button" className="industrial-button" disabled={!selectedCaseId} onClick={openNewNoteModal}><Plus className="h-4 w-4" />Notiz / Protokoll</button>
            <button type="button" className="industrial-button" disabled={!selectedCaseId} onClick={() => void importDocuments()}><FileText className="h-4 w-4" />Dokument</button>
            <button type="button" className="industrial-button" disabled={!selectedCaseId} onClick={openCaseDeadlineDraft}><CalendarPlus className="h-4 w-4" />Frist</button>
            <button type="button" className="industrial-button" disabled={!selectedCaseId} onClick={() => openCaseProcessDraft('prevention')}><Workflow className="h-4 w-4" />Prävention</button>
            <button type="button" className="industrial-secondary-button" disabled={!selectedCaseId} onClick={() => openCaseProcessDraft('bem')}>BEM</button>
            <button type="button" className="industrial-secondary-button" disabled={!selectedCaseId} onClick={() => openCaseProcessDraft('termination_hearing')}>Kündigungsanhörung</button>
            <button type="button" className="industrial-secondary-button" disabled={!selectedCaseId} onClick={() => openCaseProcessDraft('equalization')}>Gleichstellung</button>
          </footer>
        </section>
      </section>




      {isCaseCreateModalOpen && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="case-create-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><FolderKanban className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Fallakte</p>
                <h2 id="case-create-title">Neue Fallakte anlegen</h2>
                <p>Die Fallakte ist der führende Arbeitsraum. Fristen, Notizen, Dokumente und Maßnahmen hängen später daran.</p>
              </div>
            </div>
            <form onSubmit={addCase} className="industrial-form case-create-form">
              <label><span>Aktenzeichen</span><input value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} placeholder="z. B. BEM-2026-004" autoFocus /></label>
              <label><span>Name / Pseudonym</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name oder Pseudonym" /></label>
              <label><span>Kategorie</span><select value={category} onChange={(event) => setCategory(event.target.value as CaseCategory)}><option value="bem">BEM</option><option value="praevention">Prävention</option><option value="kuendigung">Kündigung</option><option value="gleichstellung">Gleichstellung</option><option value="gdb">GdB</option><option value="nachteilsausgleich">Nachteilsausgleich</option><option value="arbeitsplatzgestaltung">Arbeitsplatzgestaltung</option><option value="diskriminierung">Diskriminierung</option><option value="sonstiges">Sonstiges</option></select></label>
              <label className="industrial-modal-wide"><span>Kurzbeschreibung</span><input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="knappe Sachebene" /></label>
              {error && <div className="industrial-message industrial-message-warning industrial-modal-wide">{error}</div>}
              <div className="industrial-modal-actions industrial-modal-wide"><button type="button" className="industrial-secondary-button" onClick={cancelCaseCreateModal}>Abbrechen</button><button type="submit" className="industrial-button"><Plus className="h-4 w-4" />Fall anlegen</button></div>
            </form>
          </section>
        </div>
      )}

      {isNoteModalOpen && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal industrial-modal-wide" role="dialog" aria-modal="true" aria-labelledby="case-note-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><MessageSquare className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Fallbaum</p>
                <h2 id="case-note-title">{editingNote ? 'Notiz / Protokoll bearbeiten' : 'Neue Gesprächsnotiz / neues Protokoll'}</h2>
                <p>Diese Maske gehört zur ausgewählten Fallakte. Weitere Fallbezüge können direkt hier ergänzt werden.</p>
              </div>
            </div>
            <form onSubmit={saveNote} className="industrial-form case-note-form">
              <label><span>Titel</span><input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="z. B. Erstgespräch" autoFocus /></label>
              <label><span>Datum</span><input type="datetime-local" value={noteDate} onChange={(event) => setNoteDate(event.target.value)} /></label>
              <label><span>Typ</span><select value={noteType} onChange={(event) => setNoteType(event.target.value as CaseNoteType)}><option value="gespraech">Gespräch</option><option value="protokoll">Protokoll</option><option value="telefonat">Telefonat</option><option value="videocall">Videocall</option><option value="email">E-Mail</option><option value="bem">BEM</option><option value="anhoerung">Anhörung</option><option value="interne_notiz">Interne Notiz</option><option value="sonstiges">Sonstiges</option></select></label>
              <label><span>Beteiligte</span><input value={participants} onChange={(event) => setParticipants(event.target.value)} placeholder="optional" /></label>
              <label className="case-note-content-input"><span>Inhalt</span><textarea value={content} onChange={(event) => handleProtocolTextChange('content', event.target.value)} placeholder="Gesprächsinhalt / Protokoll … // Frist, @@ Kontakt, ## Fall, §§ Norm, !! Risiko, >> Aufgabe, ^^ Vertraulichkeit, ~~ Anonymisierung" /></label>
              <label className="case-note-content-input"><span>Nächste Schritte</span><textarea value={nextSteps} onChange={(event) => handleProtocolTextChange('nextSteps', event.target.value)} placeholder="optional · // Frist, @@ Kontakt, ## Fall, §§ Norm, !! Risiko, >> Aufgabe, ^^ Vertraulichkeit, ~~ Anonymisierung" /></label>
              <div className="case-note-link-panel">
                <span>Fallbezüge</span>
                <p className="industrial-meta">Eine Notiz kann mehreren Fallakten zugeordnet werden. Der aktuell ausgewählte Fall bleibt automatisch Bezug.</p>
                <div className="case-note-link-grid">
                  {cases.map((record) => (
                    <label key={record.id} className="industrial-checkbox-row compact">
                      <input type="checkbox" checked={linkedCaseIds.includes(record.id) || record.id === selectedCaseId} disabled={record.id === selectedCaseId} onChange={(event) => toggleLinkedCase(record.id, event.target.checked)} />
                      <span>{record.caseNumber} · {record.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label><span>Vertraulichkeit</span><select value={confidentialLevel} onChange={(event) => setConfidentialLevel(event.target.value as ConfidentialLevel)}><option value="normal">normal</option><option value="sensibel">sensibel</option><option value="hoch_sensibel">hoch sensibel</option></select></label>
              <label className="industrial-checkbox-row"><input type="checkbox" checked={containsHealthData} onChange={(event) => setContainsHealthData(event.target.checked)} /><span>enthält Gesundheits-/Behinderungsbezug</span></label>
              {noteError && <div className="industrial-message industrial-message-warning industrial-modal-wide">{noteError}</div>}
              {noteInfo && <div className="industrial-message industrial-message-ok industrial-modal-wide">{noteInfo}</div>}
              <div className="industrial-modal-actions industrial-modal-wide"><button type="button" className="industrial-secondary-button" onClick={cancelNoteModal}>Abbrechen</button><button type="submit" className="industrial-button"><Save className="h-4 w-4" />Speichern</button></div>
            </form>
          </section>
        </div>
      )}

      {inlineCaseLinkDraft && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="inline-case-link-title">
            <div className="industrial-modal-header"><div className="industrial-modal-icon"><FolderKanban className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Fallbezug</p><h2 id="inline-case-link-title">Fallbezug verknüpfen</h2><p>Der gewählte Fall wird in den Text eingefügt und als weiterer Fallbezug der Notiz gespeichert.</p></div></div>
            <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Fall suchen</span><input value={inlineCaseLinkDraft.query} onChange={(event) => setInlineCaseLinkDraft((current) => current ? { ...current, query: event.target.value } : current)} autoFocus placeholder="Aktenzeichen, Name/Pseudonym, Kategorie …" /></label></div>
            <div className="inline-contact-results">
              {filterCasesForQuery(cases, inlineCaseLinkDraft.query).map((record) => (
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
              {filterNormsForQuery(LEGAL_NORM_SUGGESTIONS, inlineLegalNormDraft.query).map((norm) => (
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

      {caseProcessDraft && selectedCase && (
        <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
          <section className="industrial-modal">
            <div className="industrial-panel-header compact">
              <div>
                <p className="industrial-kicker">Fallmaßnahme</p>
                <h2>{processTypeLabel(caseProcessDraft.processType)} anlegen</h2>
                <p>{selectedCase.caseNumber} · {selectedCase.displayName}</p>
              </div>
            </div>
            <div className="industrial-settings-form mt-5">
              <label><span>Titel</span><input value={caseProcessDraft.title} onChange={(event) => setCaseProcessDraft((current) => current ? { ...current, title: event.target.value } : current)} /></label>
              <label><span>Beschreibung / Anlass</span><textarea value={caseProcessDraft.description} onChange={(event) => setCaseProcessDraft((current) => current ? { ...current, description: event.target.value } : current)} /></label>
              {caseProcessDraft.processType === 'prevention' && <label><span>Frist Arbeitgeberreaktion optional</span><input type="datetime-local" value={caseProcessDraft.dueAt} onChange={(event) => setCaseProcessDraft((current) => current ? { ...current, dueAt: event.target.value } : current)} /></label>}
              {caseProcessDraft.processType !== 'prevention' && <div className="industrial-message industrial-message-warning">Das Fachmodul ist noch nicht vollständig gebaut. Gremia.SBV legt deshalb zunächst eine fallbezogene Maßnahme als vertrauliche Notiz an.</div>}
            </div>
            <div className="industrial-modal-actions">
              <button type="button" className="industrial-secondary-button" onClick={() => setCaseProcessDraft(null)}>Abbrechen</button>
              <button type="button" className="industrial-button" onClick={() => void createCaseProcessFromDraft()}>An Fallakte hängen</button>
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

function DeadlinesView({
  cases,
  deadlines,
  onCreateDeadline,
  onEditDeadline,
  onCompleteDeadline
}: {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onEditDeadline: (deadline: DeadlineRecord) => void;
  onCompleteDeadline: (deadline: DeadlineRecord) => void;
}) {
  const [title, setTitle] = useState('');
  const [caseId, setCaseId] = useState('');
  const [freeFollowUp, setFreeFollowUp] = useState(false);
  const [dueAt, setDueAt] = useState('');
  const [severity, setSeverity] = useState<DeadlineSeverity>('important');
  const [processType, setProcessType] = useState<DeadlineProcessType>('case');
  const [deadlineType, setDeadlineType] = useState<DeadlineType>('follow_up');
  const [legalBasis, setLegalBasis] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  async function addDeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!title.trim() || !dueAt) {
      setError('Bitte Titel und Fälligkeitsdatum erfassen.');
      return;
    }

    if (!freeFollowUp && !caseId) {
      setError('Bitte einen Fall auswählen. Ohne Fallbezug ist nur eine freie Wiedervorlage zulässig.');
      return;
    }

    try {
      await onCreateDeadline({
        title: title.trim(),
        caseId: freeFollowUp ? undefined : caseId,
        processType: freeFollowUp ? 'custom' : processType,
        deadlineType: freeFollowUp ? 'follow_up' : deadlineType,
        dueAt: fromDateTimeLocalValue(dueAt),
        severity,
        legalBasis: legalBasis.trim() || undefined,
        description: description.trim() || undefined,
        isLegalDeadline: !freeFollowUp && deadlineType === 'legal_deadline',
        calculationMode: 'manual'
      });
      setTitle('');
      setDueAt('');
      setLegalBasis('');
      setDescription('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Frist konnte nicht angelegt werden.');
    }
  }

  return (
    <ModuleFrame
      title="Fristen & Wiedervorlagen"
      kicker="48h-Regel aktiv"
      description="Echte Fristen gehören an eine Fallakte. Freie Einträge sind nur als einfache Wiedervorlagen ohne Rechtsfrist vorgesehen."
    >
      <div className="industrial-alert">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
        <p>
          Fachregel: Rechtliche Fristen, BEM-Schritte, Präventionsvorgänge, Gleichstellungsverfahren und Kündigungsanhörungen werden immer einem Fall zugeordnet. Ohne Fallbezug erlaubt Gremia.SBV nur eine freie Wiedervorlage.
        </p>
      </div>

      <form onSubmit={addDeadline} className="industrial-form industrial-form-deadline">
        <label>
          <span>Titel</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="z. B. Stellungnahme SBV" />
        </label>
        <label>
          <span>Fallbezug</span>
          <select value={caseId} disabled={freeFollowUp} onChange={(event) => setCaseId(event.target.value)}>
            <option value="">Fall auswählen</option>
            {cases.map((record) => <option key={record.id} value={record.id}>{formatCaseLabel(record)}</option>)}
          </select>
        </label>
        <label>
          <span>Fällig am</span>
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
        <label>
          <span>Prozess</span>
          <select value={processType} disabled={freeFollowUp} onChange={(event) => setProcessType(event.target.value as DeadlineProcessType)}>
            <option value="case">Fall</option>
            <option value="bem">BEM</option>
            <option value="prevention">Prävention</option>
            <option value="equalization">Gleichstellung</option>
            <option value="termination_hearing">Kündigungsanhörung</option>
            <option value="gdb">GdB</option>
          </select>
        </label>
        <label>
          <span>Typ</span>
          <select value={deadlineType} disabled={freeFollowUp} onChange={(event) => setDeadlineType(event.target.value as DeadlineType)}>
            <option value="follow_up">Wiedervorlage</option>
            <option value="legal_deadline">Rechtsfrist</option>
            <option value="workflow_step">Workflow-Schritt</option>
            <option value="appointment">Termin</option>
            <option value="warning">Warnung</option>
          </select>
        </label>
        <label>
          <span>Stufe</span>
          <select value={severity} onChange={(event) => setSeverity(event.target.value as DeadlineSeverity)}>
            <option value="normal">normal</option>
            <option value="important">wichtig</option>
            <option value="critical">kritisch</option>
            <option value="fatal">fatal</option>
          </select>
        </label>
        <label>
          <span>Rechtsbezug</span>
          <input value={legalBasis} disabled={freeFollowUp} onChange={(event) => setLegalBasis(event.target.value)} placeholder="optional" />
        </label>
        <label>
          <span>Notiz</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="optional" />
        </label>
        <label className="industrial-checkbox-row">
          <input type="checkbox" checked={freeFollowUp} onChange={(event) => setFreeFollowUp(event.target.checked)} />
          <span>freie Wiedervorlage ohne Fallbezug</span>
        </label>
        <button type="submit" className="industrial-button">
          <Plus className="h-4 w-4" />
          Frist anlegen
        </button>
      </form>
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}

      <DeadlineListView deadlines={deadlines} cases={cases} onEdit={onEditDeadline} onComplete={onCompleteDeadline} />
    </ModuleFrame>
  );
}

function DeadlineEditor({
  deadline,
  cases,
  onClose,
  onSave,
  onComplete
}: {
  deadline: DeadlineRecord;
  cases: CaseRecord[];
  onClose: () => void;
  onSave: (id: string, input: { title: string; dueAt: string; severity: DeadlineSeverity; description?: string; legalBasis?: string; reason: string }) => Promise<void>;
  onComplete: (deadline: DeadlineRecord) => Promise<void>;
}) {
  const [title, setTitle] = useState(deadline.title);
  const [dueAt, setDueAt] = useState(toDateTimeLocalValue(deadline.dueAt));
  const [severity, setSeverity] = useState<DeadlineSeverity>(deadline.severity);
  const [description, setDescription] = useState(deadline.description ?? '');
  const [legalBasis, setLegalBasis] = useState(deadline.legalBasis ?? '');
  const [reason, setReason] = useState('Bearbeitung aus Dashboard/Fristenregister');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!title.trim() || !dueAt) {
      setError('Bitte Titel und Fälligkeitsdatum erfassen.');
      return;
    }
    try {
      await onSave(deadline.id, {
        title: title.trim(),
        dueAt: fromDateTimeLocalValue(dueAt),
        severity,
        description: description.trim() || undefined,
        legalBasis: legalBasis.trim() || undefined,
        reason: reason.trim() || 'Frist bearbeitet'
      });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Frist konnte nicht gespeichert werden.');
    }
  }

  return (
    <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
      <section className="industrial-modal">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Frist bearbeiten</p>
            <h2>{deadline.title}</h2>
            <p>{deadline.caseId ? `Fallbezug: ${cases.find((item: CaseRecord) => item.id === deadline.caseId)?.caseNumber ?? 'nicht auflösbar'}` : 'Freie Wiedervorlage ohne Fallbezug'}</p>
          </div>
        </div>

        <form onSubmit={submit} className="industrial-settings-form mt-5">
          <label>
            <span>Titel</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>Fällig am</span>
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </label>
          <label>
            <span>Stufe</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value as DeadlineSeverity)}>
              <option value="normal">normal</option>
              <option value="important">wichtig</option>
              <option value="critical">kritisch</option>
              <option value="fatal">fatal</option>
            </select>
          </label>
          <label>
            <span>Rechtsbezug</span>
            <input value={legalBasis} onChange={(event) => setLegalBasis(event.target.value)} />
          </label>
          <label>
            <span>Notiz</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            <span>Änderungsgrund / Audit</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {error && <div className="industrial-message industrial-message-warning">{error}</div>}
          <div className="industrial-modal-actions">
            <button type="button" className="industrial-secondary-button" onClick={onClose}>Abbrechen</button>
            <button type="button" className="industrial-secondary-button" onClick={() => void onComplete(deadline)}>Als erledigt markieren</button>
            <button type="submit" className="industrial-button">Speichern</button>
          </div>
        </form>
      </section>
    </div>
  );
}



const preventionDifficultyOptions: { value: PreventionDifficultyType; label: string }[] = [
  { value: 'personenbedingt', label: 'personenbedingt' },
  { value: 'verhaltensbedingt', label: 'verhaltensbedingt' },
  { value: 'betriebsbedingt', label: 'betriebsbedingt' },
  { value: 'organisatorisch', label: 'organisatorisch' },
  { value: 'gesundheitlich_arbeitsplatzbezogen', label: 'gesundheitlich / arbeitsplatzbezogen' },
  { value: 'konflikt_fuehrung', label: 'Konflikt / Führung' },
  { value: 'sonstiges', label: 'sonstiges' }
];

const preventionRiskOptions: { value: PreventionRiskType; label: string }[] = [
  { value: 'abmahnung', label: 'Abmahnung' },
  { value: 'kuendigung', label: 'Kündigung' },
  { value: 'umsetzung', label: 'Umsetzung' },
  { value: 'arbeitsunfaehigkeit', label: 'Arbeitsunfähigkeit' },
  { value: 'ueberlastung', label: 'Überlastung' },
  { value: 'leistungsverlust', label: 'Leistungsverlust' },
  { value: 'arbeitsplatzverlust', label: 'Arbeitsplatzverlust' },
  { value: 'sonstiges', label: 'sonstiges' }
];

function statusLabel(status: PreventionStatus): string {
  const labels: Record<PreventionStatus, string> = {
    zu_pruefen: 'zu prüfen',
    angefordert: 'angefordert',
    arbeitgeber_reagiert: 'Arbeitgeber reagiert',
    inklusionsamt_eingeschaltet: 'Inklusionsamt eingeschaltet',
    massnahmen_in_klaerung: 'Maßnahmen in Klärung',
    massnahmen_vereinbart: 'Maßnahmen vereinbart',
    abgeschlossen: 'abgeschlossen',
    blockiert_verweigert: 'blockiert / verweigert'
  };
  return labels[status];
}


type ProcessOverviewStatusGroup<TStatus extends string, TRecord> = {
  status: TStatus;
  label: string;
  records: TRecord[];
  collapsedByDefault?: boolean;
};

type ProcessOverviewCardModel<TStatus extends string> = {
  id: string;
  caseId: string;
  caseNumber: string;
  displayName: string;
  summary: string;
  status: TStatus;
  statusLabel: string;
  riskLabel?: string;
  dueLabel?: string;
  updatedLabel?: string;
  isOverdue?: boolean;
};

const PREVENTION_OVERVIEW_STATUS_ORDER: PreventionStatus[] = [
  'zu_pruefen',
  'angefordert',
  'arbeitgeber_reagiert',
  'inklusionsamt_eingeschaltet',
  'massnahmen_in_klaerung',
  'massnahmen_vereinbart',
  'blockiert_verweigert',
  'abgeschlossen'
];

function isDonePreventionStatus(status: PreventionStatus): boolean {
  return status === 'abgeschlossen';
}

function groupProcessOverviewRecords<TRecord, TStatus extends string>(
  records: TRecord[],
  statuses: TStatus[],
  getStatus: (record: TRecord) => TStatus,
  getLabel: (status: TStatus) => string,
  isDone: (status: TStatus) => boolean
): ProcessOverviewStatusGroup<TStatus, TRecord>[] {
  return statuses.map((status) => ({
    status,
    label: getLabel(status),
    records: records.filter((record) => getStatus(record) === status),
    collapsedByDefault: isDone(status)
  }));
}

function isIsoBeforeNow(iso?: string): boolean {
  if (!iso) return false;
  const timestamp = new Date(iso).getTime();
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function ProcessOverviewCard<TStatus extends string>({
  item,
  onOpen
}: {
  item: ProcessOverviewCardModel<TStatus>;
  onOpen: (item: ProcessOverviewCardModel<TStatus>) => void;
}) {
  return (
    <button type="button" className="process-overview-card" onClick={() => onOpen(item)}>
      <div>
        <strong>{item.caseNumber}</strong>
        <span>{item.displayName}</span>
        <p>{item.summary}</p>
      </div>
      <div className="process-overview-card-meta">
        <span className="process-overview-badge">{item.statusLabel}</span>
        {item.riskLabel && <span className="process-overview-badge muted">{item.riskLabel}</span>}
        {item.dueLabel && <span className={`process-overview-badge ${item.isOverdue ? 'warning' : 'muted'}`}>Frist: {item.dueLabel}</span>}
        {item.updatedLabel && <small>geändert: {item.updatedLabel}</small>}
      </div>
    </button>
  );
}

function ProcessOverviewGroup<TStatus extends string>({
  group,
  renderItem,
  emptyText
}: {
  group: ProcessOverviewStatusGroup<TStatus, ProcessOverviewCardModel<TStatus>>;
  renderItem: (item: ProcessOverviewCardModel<TStatus>) => ReactNode;
  emptyText: string;
}) {
  const [open, setOpen] = useState(!group.collapsedByDefault);
  return (
    <section className="process-overview-group">
      <button type="button" className="process-overview-group-header" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span>{open ? '▾' : '▸'}</span>
        <strong>{group.label}</strong>
        <em>{group.records.length}</em>
      </button>
      {open && (
        <div className="process-overview-group-body">
          {group.records.map(renderItem)}
          {!group.records.length && <div className="industrial-empty compact">{emptyText}</div>}
        </div>
      )}
    </section>
  );
}

function ProcessOverviewPage<TStatus extends string>({
  title,
  kicker,
  description,
  stats,
  groups,
  renderItem,
  emptyText
}: {
  title: string;
  kicker: string;
  description: string;
  stats: Array<{ label: string; value: number | string }>;
  groups: ProcessOverviewStatusGroup<TStatus, ProcessOverviewCardModel<TStatus>>[];
  renderItem: (item: ProcessOverviewCardModel<TStatus>) => ReactNode;
  emptyText: string;
}) {
  return (
    <ModuleFrame title={title} kicker={kicker} description={description}>
      <section className="industrial-panel process-overview-panel">
        <div className="process-overview-stats" aria-label="Kennzahlen">
          {stats.map((stat) => (
            <div key={stat.label} className="process-overview-stat">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
        <div className="process-overview-groups">
          {groups.map((group) => (
            <ProcessOverviewGroup key={group.status} group={group} renderItem={renderItem} emptyText={emptyText} />
          ))}
        </div>
      </section>
    </ModuleFrame>
  );
}

function StepTooltip({ text }: { text: string }) {
  return (
    <span className="industrial-help-dot" title={text} aria-label={text}>
      <HelpCircle className="h-3.5 w-3.5" />
    </span>
  );
}

function PreventionView({
  cases,
  onOpenCaseNode
}: {
  cases: CaseRecord[];
  onOpenCaseNode: (target: CaseNodeTarget) => void;
}) {
  const [processes, setProcesses] = useState<PreventionProcessRecord[]>([]);
  const [error, setError] = useState('');

  async function reload() {
    const bridge = await waitForBridge();
    if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
    const rows = await bridge.prevention.list();
    setProcesses(rows);
  }

  useEffect(() => {
    void reload().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Präventionsverfahren konnten nicht geladen werden.'));
  }, [cases.length]);

  const cards = useMemo<ProcessOverviewCardModel<PreventionStatus>[]>(() => processes.map((process) => {
    const record = cases.find((item) => item.id === process.caseId);
    return {
      id: process.id,
      caseId: process.caseId,
      caseNumber: record?.caseNumber ?? 'Fall nicht auflösbar',
      displayName: record?.displayName ?? 'unbekannte Fallakte',
      summary: process.hazardDescription || record?.summary || 'Keine Kurzbeschreibung hinterlegt.',
      status: process.status,
      statusLabel: statusLabel(process.status),
      riskLabel: process.riskType.replaceAll('_', ' '),
      dueLabel: formatDateShort(process.employerResponseDueAt),
      updatedLabel: formatDateShort(process.updatedAt),
      isOverdue: !isDonePreventionStatus(process.status) && isIsoBeforeNow(process.employerResponseDueAt)
    };
  }), [processes, cases]);

  const groups = useMemo(() => groupProcessOverviewRecords(
    cards,
    PREVENTION_OVERVIEW_STATUS_ORDER,
    (item) => item.status,
    statusLabel,
    isDonePreventionStatus
  ), [cards]);

  const openCount = cards.filter((item) => !isDonePreventionStatus(item.status)).length;
  const doneCount = cards.filter((item) => isDonePreventionStatus(item.status)).length;
  const overdueCount = cards.filter((item) => item.isOverdue).length;
  const highRiskCount = processes.filter((process) => ['kuendigung', 'chronifizierung', 'eskalation'].includes(process.riskType)).length;

  return (
    <>
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      <ProcessOverviewPage
        title="Präventionsverfahren"
        kicker="§ 167 Abs. 1 SGB IX"
        description="Übersicht über fallbezogene Präventionsverfahren. Die Bearbeitung erfolgt ausschließlich in der Fallakte."
        stats={[
          { label: 'offen', value: openCount },
          { label: 'überfällig', value: overdueCount },
          { label: 'hohes Risiko', value: highRiskCount },
          { label: 'erledigt', value: doneCount }
        ]}
        groups={groups}
        emptyText="Keine Verfahren in diesem Status."
        renderItem={(item) => (
          <ProcessOverviewCard
            key={item.id}
            item={item}
            onOpen={(target) => onOpenCaseNode({ caseId: target.caseId, nodeType: 'prevention', nodeId: target.id })}
          />
        )}
      />
    </>
  );
}

function ContactsView({ contacts, onCreateContact, onDeleteContact }: { contacts: ContactRecord[]; onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>; onDeleteContact: (contact: ContactRecord) => Promise<DeleteContactResult> }) {
  const [query, setQuery] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<ContactCategory>('sonstiges');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();

  const filteredContacts = useMemo(() => filterContactsForQuery(contacts, query), [contacts, query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const created = await onCreateContact({
        firstName,
        lastName,
        organization: organization || undefined,
        role: role || undefined,
        category,
        email: email || undefined,
        phone: phone || undefined
      });
      setFirstName('');
      setLastName('');
      setOrganization('');
      setRole('');
      setCategory('sonstiges');
      setEmail('');
      setPhone('');
      setMessage(`Kontakt angelegt: ${formatContactReference(created)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kontakt konnte nicht angelegt werden.');
    }
  }

  return (
    <ModuleFrame title="Kontakte" kicker="Netzwerk" description="Ansprechpersonen, Stellen und interne Kontakte. In Protokollen mit @@ einfügen.">
      <section className="industrial-grid-two">
        <section className="industrial-panel">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Register</p><h2>Kontaktliste</h2></div></div>
          <label className="industrial-search"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kontakt suchen …" /></label>
          <div className="contact-register-list">
            {filteredContacts.map((contact) => (
              <article key={contact.id} className="contact-register-card">
                <div>
                  <strong>{formatContactReference(contact)}</strong>
                  <span>{[contact.role, contact.email, contact.phone].filter(Boolean).join(' · ') || contact.category}</span>
                </div>
                <button
                  type="button"
                  className="industrial-danger-button compact"
                  onClick={async () => {
                    setError('');
                    setMessage('');
                    const ok = await confirmDialog({
                      variant: 'danger',
                      title: 'Kontakt löschen?',
                      message: `Der Kontakt wird gelöscht. Bekannte Textstellen werden anonymisiert.\n\n${formatContactReference(contact)}`,
                      confirmLabel: 'Kontakt löschen',
                      cancelLabel: 'Abbrechen'
                    });
                    if (!ok) return;
                    try {
                      const result = await onDeleteContact(contact);
                      const successMessage = result.anonymizedReferences
                        ? `Kontakt gelöscht. ${result.anonymizedReferences} Textbezug/Textbezüge in ${result.touchedNotes} Protokoll(en) wurden anonymisiert.`
                        : 'Kontakt gelöscht. Es wurden keine gespeicherten Textbezüge gefunden.';
                      setMessage(successMessage);
                      announce(successMessage, 'polite');
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Kontakt konnte nicht gelöscht werden.';
                      setError(errorMessage);
                      announce(errorMessage, 'assertive');
                    }
                  }}
                  title="Kontakt löschen und Textbezüge anonymisieren"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </article>
            ))}
            {!filteredContacts.length && <div className="industrial-empty">Noch keine passenden Kontakte vorhanden.</div>}
          </div>
        </section>

        <section className="industrial-panel">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Erfassen</p><h2>Kontakt anlegen</h2></div></div>
          <form onSubmit={submit} className="industrial-form">
            <label><span>Vorname</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
            <label><span>Nachname</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
            <label><span>Firma / Stelle</span><input value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
            <label><span>Rolle</span><input value={role} onChange={(event) => setRole(event.target.value)} placeholder="z. B. Personalleiter" /></label>
            <label><span>Kategorie</span><select value={category} onChange={(event) => setCategory(event.target.value as ContactCategory)}><option value="arbeitgeber">Arbeitgeber</option><option value="inklusionsamt">Inklusionsamt</option><option value="agentur_fuer_arbeit">Agentur für Arbeit</option><option value="betriebsarzt">Betriebsarzt</option><option value="reha">Reha</option><option value="anwalt">Anwalt</option><option value="betriebsrat">Betriebsrat</option><option value="beratung">Beratung</option><option value="intern">intern</option><option value="sonstiges">sonstiges</option></select></label>
            <label><span>E-Mail</span><input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label><span>Telefon</span><input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            {error && <div className="industrial-message industrial-message-warning">{error}</div>}
            {message && <div className="industrial-message industrial-message-ok">{message}</div>}
            <button type="submit" className="industrial-button"><Save className="h-4 w-4" />Kontakt speichern</button>
          </form>
        </section>
      </section>
    </ModuleFrame>
  );
}


const REPORT_TYPE_ORDER: ReportType[] = [
  'activity',
  'privacy_audit',
  'case_deadline_controlling',
  'bem_prevention',
  'termination_hearings',
  'system_integrity'
];

function defaultReportPeriod(): { periodStart: string; periodEnd: string } {
  const year = new Date().getFullYear();
  return {
    periodStart: `${year}-01-01T00:00`,
    periodEnd: `${year}-12-31T23:59`
  };
}

function reportConfidentialityLabel(value: ReportDescriptor['confidentiality']): string {
  if (value === 'anonymized') return 'anonymisiert';
  if (value === 'technical') return 'technisch vertraulich';
  return 'intern vertraulich';
}

function ReportsView() {
  const defaultPeriod = useMemo(() => defaultReportPeriod(), []);
  const [descriptors, setDescriptors] = useState<ReportDescriptor[]>([]);
  const [history, setHistory] = useState<ReportExportHistoryItem[]>([]);
  const [periodStart, setPeriodStart] = useState(defaultPeriod.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.periodEnd);
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [result, setResult] = useState<ReportGenerationResult | null>(null);
  const [error, setError] = useState('');

  async function loadReportsMeta() {
    const bridge = await waitForBridge();
    if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
    const [descriptorRows, historyRows] = await Promise.all([
      bridge.reports.descriptors(),
      bridge.reports.history(15)
    ]);
    const ordered = [...descriptorRows].sort((a, b) => REPORT_TYPE_ORDER.indexOf(a.type) - REPORT_TYPE_ORDER.indexOf(b.type));
    setDescriptors(ordered);
    setHistory(historyRows);
  }

  useEffect(() => {
    loadReportsMeta().catch((error) => {
      console.error('Gremia.SBV report metadata failed', error);
      setError(error instanceof Error ? error.message : 'Berichtsmodul konnte nicht geladen werden.');
    });
  }, []);

  async function generateReport(type: ReportType) {
    setGenerating(type);
    setError('');
    setResult(null);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
      const input: GenerateReportInput = {
        type,
        periodStart: periodStart ? new Date(periodStart).toISOString() : undefined,
        periodEnd: periodEnd ? new Date(periodEnd).toISOString() : undefined
      };
      const generated = await bridge.reports.generate(input);
      if (!generated.ok) throw new Error(generated.error ?? 'Bericht konnte nicht erzeugt werden.');
      setResult(generated);
      await loadReportsMeta();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bericht konnte nicht erzeugt werden.');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <ModuleFrame title="Berichte" kicker="Audit & Auswertung" description="PDF-Berichte im Industrial-Design: anonymisierter Tätigkeitsbericht, Datenschutz-Audit und interne Steuerungsberichte.">
      <section className="industrial-panel">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Zeitraum</p>
            <h2>Berichtsparameter</h2>
          </div>
        </div>
        <div className="industrial-form-grid">
          <label>
            <span>Von</span>
            <input type="datetime-local" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </label>
          <label>
            <span>Bis</span>
            <input type="datetime-local" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </label>
        </div>
      </section>

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {result && (
        <section className="industrial-panel report-result-panel">
          <div className="industrial-panel-header compact">
            <div>
              <p className="industrial-kicker">PDF erzeugt</p>
              <h2>{result.title}</h2>
              <p>{result.fileName}</p>
            </div>
            <button className="industrial-secondary-button" onClick={() => void window.gremiaSbv?.reports?.openExportFolder(result.filePath)}>
              <FolderOpen className="h-4 w-4" /> PDF öffnen
            </button>
          </div>
          {!!result.warnings.length && (
            <div className="industrial-message industrial-message-warning mt-4">
              {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}
        </section>
      )}

      <section className="industrial-report-grid" aria-label="Berichtsauswahl">
        {descriptors.map((descriptor) => {
          const isGenerating = generating === descriptor.type;
          return (
            <article
              key={descriptor.type}
              className={`industrial-report-card clickable ${isGenerating ? 'is-busy' : ''}`}
              role="button"
              tabIndex={0}
              aria-busy={isGenerating}
              aria-label={`${descriptor.title} als PDF erzeugen`}
              onClick={() => { if (!generating) void generateReport(descriptor.type); }}
              onKeyDown={(event) => {
                if (!generating && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  void generateReport(descriptor.type);
                }
              }}
            >
              <div>
                <p className="industrial-kicker">{reportConfidentialityLabel(descriptor.confidentiality)}</p>
                <h3>{descriptor.title}</h3>
                <p>{descriptor.description}</p>
              </div>
              <div className="industrial-report-card-footer">
                <span>{isGenerating ? 'PDF wird erzeugt …' : 'Klicken zum Erzeugen'}</span>
                <FileText className="h-4 w-4" />
              </div>
            </article>
          );
        })}
      </section>

      <section className="industrial-panel">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Historie</p>
            <h2>Letzte PDF-Exporte</h2>
            <p>Archivierte Berichte werden verschlüsselt abgelegt. Beim Öffnen wird eine temporäre PDF-Arbeitskopie erzeugt.</p>
          </div>
        </div>
        <div className="industrial-table-shell case-register-table-shell">
          <table className="industrial-table">
            <thead><tr><th>Zeitpunkt</th><th>Bericht</th><th>Datei</th><th>Hinweise</th><th></th></tr></thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.generatedAt).toLocaleString('de-DE')}</td>
                  <td>{item.title}</td>
                  <td>{item.fileName}</td>
                  <td>{item.warningCount}</td>
                  <td><button className="industrial-icon-button" onClick={() => void window.gremiaSbv?.reports?.openExportFolder(item.filePath)} title="PDF öffnen"><FolderOpen className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={5}>Noch keine Berichte erzeugt.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </ModuleFrame>
  );
}

function SettingsView({ theme, onThemeChange, cases }: { theme: ThemeMode; onThemeChange: (theme: ThemeMode) => void; cases: CaseRecord[] }) {
  return (
    <ModuleFrame title="Einstellungen" kicker="System" description="Passwortverwaltung, Darstellung und lokale Anwendungseinstellungen.">
      <div className="grid gap-6 xl:grid-cols-2">
        <ThemeSettingsForm theme={theme} onThemeChange={onThemeChange} />
        <TemplateDefaultSettingsForm />
        <ChangePasswordForm />
        <BackupRestoreForm />
        <RetentionSettingsPanel cases={cases} />
      </div>
    </ModuleFrame>
  );
}

function ThemeSettingsForm({ theme, onThemeChange }: { theme: ThemeMode; onThemeChange: (theme: ThemeMode) => void }) {
  return (
    <section className="industrial-settings-form">
      <div>
        <h3>Darstellung</h3>
        <p className="industrial-settings-note">Industrial bleibt die Designsprache. Der Light-Mode hellt nur die Arbeitsfläche auf, ohne daraus ein freundliches Wellness-Layout zu machen.</p>
      </div>

      <div className="industrial-theme-switch" role="group" aria-label="Darstellung auswählen">
        <button
          type="button"
          className={theme === 'dark' ? 'active' : ''}
          onClick={() => onThemeChange('dark')}
        >
          <Moon className="h-4 w-4" />
          Dark Industrial
        </button>
        <button
          type="button"
          className={theme === 'light' ? 'active' : ''}
          onClick={() => onThemeChange('light')}
        >
          <Sun className="h-4 w-4" />
          Light Industrial
        </button>
      </div>
    </section>
  );
}


function TemplateDefaultSettingsForm() {
  const [values, setValues] = useState<TemplateDefaultValues>(EMPTY_TEMPLATE_DEFAULT_VALUES);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadTemplateDefaultValues()
      .then((loaded) => {
        if (!active) return;
        setValues(loaded);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Standardwerte konnten nicht geladen werden.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const saved = await saveTemplateDefaultValues(values);
      setValues(saved);
      setMessage('Standardwerte wurden gespeichert.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Standardwerte konnten nicht gespeichert werden.');
    }
  }

  function updateValue(key: TemplateDefaultKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={submit} className="industrial-settings-form template-default-settings xl:col-span-2">
      <div>
        <h3>Vorlagen & Standardwerte</h3>
        <p className="industrial-settings-note">
          Diese Werte füllen allgemeine Platzhalter wie <code>{'{{sbv.name}}'}</code> oder <code>{'{{arbeitgeber.ansprechpartner}}'}</code>.
          Konkrete Fall-, Frist- oder Maßnahmendaten überschreiben diese Standardwerte beim Erzeugen eines Schreibens.
        </p>
      </div>

      {loading ? (
        <div className="industrial-empty">Standardwerte werden geladen …</div>
      ) : (
        <div className="template-default-grid">
          {TEMPLATE_DEFAULT_FIELDS.map((field) => (
            <label key={field.key} className={field.multiline ? 'template-default-wide' : undefined}>
              <span>{field.label}</span>
              <small>{field.description}</small>
              {field.multiline ? (
                <textarea value={values[field.key]} onChange={(event) => updateValue(field.key, event.target.value)} />
              ) : (
                <input value={values[field.key]} onChange={(event) => updateValue(field.key, event.target.value)} />
              )}
            </label>
          ))}
        </div>
      )}

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {message && <div className="industrial-message industrial-message-ok">{message}</div>}

      <button type="submit" className="industrial-button" disabled={loading}>
        <Save className="h-4 w-4" /> Standardwerte speichern
      </button>
    </form>
  );
}


function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== repeatPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError('Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.');
        return;
      }

      const result = await bridge.security.changePassword(currentPassword, newPassword);
      if (!result.ok) {
        setError(result.error ?? 'Das Passwort konnte nicht geändert werden.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      setMessage('Passwort wurde geändert.');
    } catch (error) {
      console.error('Gremia.SBV security operation failed', error);
      setError('Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.');
    }
  }

  return (
    <form onSubmit={submit} className="industrial-settings-form max-w-2xl">
      <h3>Passwort ändern</h3>
      <label>
        <span>Aktuelles Passwort</span>
        <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      </label>
      <label>
        <span>Neues Passwort</span>
        <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      </label>
      <label>
        <span>Neues Passwort wiederholen</span>
        <input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} />
      </label>

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {message && <div className="industrial-message industrial-message-ok">{message}</div>}

      <button type="submit" className="industrial-button">
        Passwort ändern
      </button>
    </form>
  );
}


function BackupRestoreForm() {
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [verifyPassphrase, setVerifyPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreConfirmation, setRestoreConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BackupOperationResult | BackupInspectionResult | null>(null);
  const [error, setError] = useState('');

  function resetMessages() {
    setResult(null);
    setError('');
  }

  function validateBackupPassphrase(passphrase: string): string | null {
    if (passphrase.length < 12) return 'Die Backup-Passphrase muss mindestens 12 Zeichen lang sein.';
    return null;
  }

  async function createBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(backupPassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup) throw new Error('Backup-Dienst ist nicht erreichbar.');
      const operationResult = await bridge.backup.create(backupPassphrase);
      if (!operationResult.ok) setError(operationResult.error ?? 'Backup konnte nicht erstellt werden.');
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function inspectBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(verifyPassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup) throw new Error('Backup-Dienst ist nicht erreichbar.');
      const operationResult = await bridge.backup.inspect(verifyPassphrase);
      if (!operationResult.ok) setError(operationResult.error ?? 'Backup konnte nicht geprüft werden.');
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(restorePassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup) throw new Error('Backup-Dienst ist nicht erreichbar.');
      const operationResult = await bridge.backup.restore(restorePassphrase, restoreConfirmation);
      if (!operationResult.ok) setError(operationResult.error ?? 'Backup konnte nicht wiederhergestellt werden.');
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="industrial-settings-form xl:col-span-2">
      <div>
        <h3>Backup & Wiederherstellung</h3>
        <p className="industrial-settings-note">
          Backups werden als verschlüsselte <code>.gsbvbackup</code>-Datei erzeugt. Die Datei enthält Datenbank, Sicherheitsmanifest,
          Dokumente und verschlüsselte Berichtsexporte. Temporäre Klartextkopien werden nicht gesichert.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="industrial-subpanel">
          <h4>Backup erstellen</h4>
          <label>
            <span>Backup-Passphrase</span>
            <input type="password" value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)} />
          </label>
          <button type="button" className="industrial-button" disabled={busy} onClick={() => void createBackup()}>
            <Save className="h-4 w-4" /> Backup speichern
          </button>
        </div>

        <div className="industrial-subpanel">
          <h4>Backup prüfen</h4>
          <label>
            <span>Backup-Passphrase</span>
            <input type="password" value={verifyPassphrase} onChange={(event) => setVerifyPassphrase(event.target.value)} />
          </label>
          <button type="button" className="industrial-secondary-button" disabled={busy} onClick={() => void inspectBackup()}>
            Backup prüfen
          </button>
        </div>

        <div className="industrial-subpanel industrial-danger-zone">
          <h4>Wiederherstellen</h4>
          <p className="industrial-settings-note">Ersetzt den aktuellen lokalen Datenbestand. Der bisherige Stand wird vorher in einen Sicherheitsordner verschoben.</p>
          <label>
            <span>Backup-Passphrase</span>
            <input type="password" value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} />
          </label>
          <label>
            <span>Bestätigung: BACKUP WIEDERHERSTELLEN</span>
            <input value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} />
          </label>
          <button type="button" className="industrial-danger-button" disabled={busy} onClick={() => void restoreBackup()}>
            Backup wiederherstellen
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="industrial-secondary-button" onClick={() => void window.gremiaSbv?.backup?.openBackupFolder()}>
          <FolderOpen className="h-4 w-4" /> Backup-Ordner öffnen
        </button>
      </div>

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {result?.ok && (
        <div className="industrial-message industrial-message-ok">
          <strong>{result.restartRequired ? 'Wiederherstellung vorbereitet.' : 'verifiedAt' in result ? 'Backup erfolgreich geprüft.' : 'Backup-Vorgang abgeschlossen.'}</strong>
          <p>{result.fileName}</p>
          <p>{result.fileCount ?? 0} Dateien · {result.totalBytes ?? 0} Bytes</p>
          {result.restartRequired && <p>Bitte Gremia.SBV jetzt vollständig schließen und neu starten.</p>}
          {result.warnings?.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}
    </section>
  );
}


function RetentionSettingsPanel({ cases }: { cases: CaseRecord[] }) {
  const [dashboard, setDashboard] = useState<RetentionDashboard | null>(null);
  const [settings, setSettings] = useState<RetentionSettings | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function reloadRetention() {
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention) throw new Error('Löschdienst ist nicht erreichbar.');
      const [nextSettings, nextDashboard] = await Promise.all([
        bridge.retention.getSettings(),
        bridge.retention.dashboard()
      ]);
      setSettings(nextSettings);
      setDashboard(nextDashboard);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    void reloadRetention();
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention) throw new Error('Löschdienst ist nicht erreichbar.');
      const updated = await bridge.retention.updateSettings(settings);
      setSettings(updated);
      setMessage('Lösch- und Prüffristen wurden gespeichert.');
      await reloadRetention();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function runCaseAction(action: 'anonymize' | 'delete') {
    if (!selectedCaseId) {
      setError('Bitte einen Fall auswählen.');
      return;
    }
    if (!reason.trim()) {
      setError('Bitte einen Grund dokumentieren.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention) throw new Error('Löschdienst ist nicht erreichbar.');
      const result: RetentionOperationResult = action === 'anonymize'
        ? await bridge.retention.anonymizeCase(selectedCaseId, reason, confirmation)
        : await bridge.retention.deleteCase(selectedCaseId, reason, confirmation);
      if (!result.ok) {
        setError(result.error ?? 'Aktion konnte nicht durchgeführt werden.');
        return;
      }
      setMessage(result.message ?? 'Aktion wurde durchgeführt.');
      setReason('');
      setConfirmation('');
      await reloadRetention();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function updateSetting<K extends keyof RetentionSettings>(key: K, value: string) {
    const parsed = Number(value);
    if (!settings || !Number.isFinite(parsed)) return;
    setSettings({ ...settings, [key]: Math.max(1, Math.trunc(parsed)) });
  }

  const candidates = dashboard?.candidates ?? [];
  const criticalCandidates = candidates.filter((candidate) => candidate.riskLevel === 'critical');
  const reviewCandidates = candidates.slice(0, 12);

  return (
    <section className="industrial-settings-form xl:col-span-2">
      <div>
        <h3>Datenschutz: Löschprüfung & Aufbewahrung</h3>
        <p className="industrial-settings-note">
          Gremia.SBV löscht nicht automatisch. Die App erkennt Prüfkandidaten, dokumentiert Entscheidungen und führt Anonymisierung oder Löschung nur nach bewusster Bestätigung aus.
        </p>
      </div>

      {settings && (
        <div className="grid gap-4 lg:grid-cols-5">
          <label><span>Abgeschlossene Fälle prüfen nach Monaten</span><input type="number" min={1} value={settings.closedCaseReviewMonths} onChange={(e) => updateSetting('closedCaseReviewMonths', e.target.value)} /></label>
          <label><span>Inaktive offene Fälle prüfen nach Monaten</span><input type="number" min={1} value={settings.inactiveOpenCaseMonths} onChange={(e) => updateSetting('inactiveOpenCaseMonths', e.target.value)} /></label>
          <label><span>Kontakte ohne Bezug prüfen nach Tagen</span><input type="number" min={1} value={settings.orphanContactReviewDays} onChange={(e) => updateSetting('orphanContactReviewDays', e.target.value)} /></label>
          <label><span>Erledigte Fristen prüfen nach Monaten</span><input type="number" min={1} value={settings.completedDeadlineRetentionMonths} onChange={(e) => updateSetting('completedDeadlineRetentionMonths', e.target.value)} /></label>
          <label><span>Mindestfallzahl für Berichte</span><input type="number" min={2} value={settings.minimumGroupSizeForReports} onChange={(e) => updateSetting('minimumGroupSizeForReports', e.target.value)} /></label>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="industrial-button" disabled={busy} onClick={() => void saveSettings()}>Einstellungen speichern</button>
        <button type="button" className="industrial-secondary-button" disabled={busy} onClick={() => void reloadRetention()}>Prüfung aktualisieren</button>
      </div>

      {dashboard && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="industrial-subpanel"><h4>Gesamt</h4><strong className="text-2xl">{dashboard.counts.total}</strong></div>
          <div className="industrial-subpanel"><h4>Kritisch</h4><strong className="text-2xl text-red-300">{dashboard.counts.critical}</strong></div>
          <div className="industrial-subpanel"><h4>Prüfen</h4><strong className="text-2xl text-yellow-300">{dashboard.counts.warning}</strong></div>
          <div className="industrial-subpanel"><h4>Hinweis</h4><strong className="text-2xl">{dashboard.counts.info}</strong></div>
        </div>
      )}

      {!!criticalCandidates.length && (
        <div className="industrial-message industrial-message-warning">
          <strong>Kritische Datenschutz-/Integritätsprüfungen offen.</strong>
          <p>{criticalCandidates.length} Eintrag/Einträge sollten zeitnah geprüft werden.</p>
        </div>
      )}

      <div className="industrial-table-shell">
        <table className="industrial-table">
          <thead><tr><th>Risiko</th><th>Typ</th><th>Bezug</th><th>Empfehlung</th><th>Hinweis</th></tr></thead>
          <tbody>
            {reviewCandidates.map((candidate: RetentionCandidate) => (
              <tr key={candidate.id}>
                <td>{candidate.riskLevel === 'critical' ? 'Kritisch' : candidate.riskLevel === 'warning' ? 'Prüfen' : 'Hinweis'}</td>
                <td>{candidate.title}</td>
                <td>{candidate.reference ?? '—'}</td>
                <td>{candidate.recommendedAction}</td>
                <td>{candidate.description}</td>
              </tr>
            ))}
            {!reviewCandidates.length && <tr><td colSpan={5}>Keine Lösch- oder Aufbewahrungsprüfungen offen.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="industrial-subpanel industrial-danger-zone">
        <h4>Fall anonymisieren oder löschen</h4>
        <p className="industrial-settings-note">Diese Funktionen sind bewusst streng. Bitte vor Löschung ein Backup erstellen und den Grund dokumentieren.</p>
        <label>
          <span>Fall</span>
          <select value={selectedCaseId} onChange={(event) => setSelectedCaseId(event.target.value)}>
            <option value="">Fall auswählen</option>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} · {item.displayName}</option>)}
          </select>
        </label>
        <label><span>Grund / Dokumentation</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <label><span>Bestätigung</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="FALL ANONYMISIEREN oder FALL LÖSCHEN" /></label>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="industrial-secondary-button" disabled={busy} onClick={() => void runCaseAction('anonymize')}>Fall anonymisieren</button>
          <button type="button" className="industrial-danger-button" disabled={busy} onClick={() => void runCaseAction('delete')}>Fall löschen</button>
        </div>
      </div>

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {message && <div className="industrial-message industrial-message-ok">{message}</div>}
    </section>
  );
}


const SBV_ADVISOR_KNOWLEDGE_ENTRIES = [
  {
    id: 'advisor-sgb-ix-151',
    source: 'SGB IX',
    paragraph: '§ 151 SGB IX',
    title: 'Geltungsbereich Schwerbehindertenrecht',
    shortText: 'Regelt, für wen die besonderen Schutz- und Förderrechte schwerbehinderter Menschen gelten.',
    sbvMeaning: 'Prüfe zuerst, ob Schwerbehinderung, Gleichstellung oder ein laufender Antrag relevant ist. Davon hängt ab, welche Beteiligungs- und Schutzrechte greifen.',
    practiceNote: 'In der Fallakte den Status sauber dokumentieren: anerkannt, gleichgestellt, Antrag läuft oder unklar.',
    typicalCases: 'Neue Beratung, unklarer Status, Gleichstellungsantrag, Beteiligung bei personeller Maßnahme.',
    tags: ['Schwerbehinderung', 'Gleichstellung', 'Status', 'Anwendungsbereich']
  },
  {
    id: 'advisor-sgb-ix-152',
    source: 'SGB IX',
    paragraph: '§ 152 SGB IX',
    title: 'Feststellung der Behinderung',
    shortText: 'Grundlage für die Feststellung des Grades der Behinderung und der Merkzeichen.',
    sbvMeaning: 'Wichtig für Beratung zur Antragstellung und für die Einordnung, ob besonderer Schutz bereits sicher oder noch in Klärung ist.',
    practiceNote: 'SBV kann beim Antrag unterstützen, sollte aber keine medizinische Bewertung vornehmen. Fristen und Bescheide als Dokumente ablegen.',
    typicalCases: 'Erstantrag, Verschlimmerungsantrag, Merkzeichen, Widerspruch gegen GdB.',
    tags: ['GdB', 'Antrag', 'Merkzeichen', 'Versorgungsamt']
  },
  {
    id: 'advisor-sgb-ix-163',
    source: 'SGB IX',
    paragraph: '§ 163 SGB IX',
    title: 'Beschäftigungspflicht und Ausgleichsabgabe',
    shortText: 'Arbeitgeber müssen schwerbehinderte Menschen beschäftigen und Nichterfüllung ausgleichen.',
    sbvMeaning: 'Hilft bei strategischen Gesprächen über Beschäftigung, Personalplanung und Inklusion.',
    practiceNote: 'Nicht nur Quote betrachten: entscheidend ist, ob konkrete Beschäftigungsmöglichkeiten geprüft und genutzt werden.',
    typicalCases: 'Personalplanung, Stellenbesetzung, Inklusionsvereinbarung, Berichtspflichten.',
    tags: ['Beschäftigungspflicht', 'Quote', 'Ausgleichsabgabe', 'Personalplanung']
  },
  {
    id: 'advisor-sgb-ix-164',
    source: 'SGB IX',
    paragraph: '§ 164 SGB IX',
    title: 'Pflichten des Arbeitgebers und behinderungsgerechte Beschäftigung',
    shortText: 'Zentrale Anspruchsgrundlage für leidens- und behinderungsgerechte Beschäftigung, Ausstattung und Förderung.',
    sbvMeaning: 'Kernnorm für Arbeitsplatzanpassung, technische Hilfen, Arbeitsorganisation, Qualifizierung und Nachteilsausgleich.',
    practiceNote: 'Immer konkret fragen: Welche Tätigkeit, welche Einschränkung, welche Anpassung, welche Kostenstelle, welche Fördermöglichkeit?',
    typicalCases: 'Homeoffice, Teilzeit, Arbeitsplatzgestaltung, Hilfsmittel, Aufgabenänderung, Überlastung.',
    tags: ['Arbeitsplatzgestaltung', 'Nachteilsausgleich', 'Homeoffice', 'Hilfsmittel', 'Teilzeit']
  },
  {
    id: 'advisor-sgb-ix-165',
    source: 'SGB IX',
    paragraph: '§ 165 SGB IX',
    title: 'Pflichten öffentlicher Arbeitgeber bei Stellenbesetzung',
    shortText: 'Öffentliche Arbeitgeber haben besondere Prüf- und Einladungspflichten gegenüber schwerbehinderten Bewerbenden.',
    sbvMeaning: 'Für SBV relevant bei Auswahlverfahren, internen Bewerbungen und Verdacht auf Benachteiligung.',
    practiceNote: 'Frühzeitig Unterlagen, Bewerberfeld und Beteiligung der SBV sichern. Nicht erst nach Auswahlentscheidung reagieren.',
    typicalCases: 'Bewerbung, interne Stelle, Einladungspflicht, Auswahlentscheidung, AGG-Risiko.',
    tags: ['Bewerbung', 'Stellenbesetzung', 'Einladung', 'öffentlicher Arbeitgeber']
  },
  {
    id: 'advisor-sgb-ix-167-1',
    source: 'SGB IX',
    paragraph: '§ 167 Abs. 1 SGB IX',
    title: 'Präventionsverfahren',
    shortText: 'Bei Schwierigkeiten, die das Arbeitsverhältnis gefährden können, muss der Arbeitgeber frühzeitig Prävention betreiben.',
    sbvMeaning: 'Sehr starkes Werkzeug der SBV, wenn Belastung, Konflikt oder gesundheitliche Gefährdung eskaliert.',
    practiceNote: 'Schriftlich einfordern, Anlass konkret benennen, Beteiligte und Frist zur Arbeitgeberreaktion dokumentieren.',
    typicalCases: 'Überlastung, Konflikt mit Führungskraft, drohende Kündigung, Arbeitsplatzverlust, Chronifizierungsrisiko.',
    tags: ['Prävention', 'Gefährdung', 'Arbeitgeberpflicht', 'Inklusionsamt']
  },
  {
    id: 'advisor-sgb-ix-167-2',
    source: 'SGB IX',
    paragraph: '§ 167 Abs. 2 SGB IX',
    title: 'Betriebliches Eingliederungsmanagement',
    shortText: 'BEM ist anzubieten, wenn Beschäftigte länger als sechs Wochen arbeitsunfähig sind.',
    sbvMeaning: 'SBV achtet auf Freiwilligkeit, Datenschutz, sauberes Verfahren und konkrete Maßnahmen statt Symboltermin.',
    practiceNote: 'Einwilligung, Teilnehmende, Ziele, Maßnahmen und Ergebnis getrennt dokumentieren. Keine Gesundheitsdaten ohne Erforderlichkeit.',
    typicalCases: 'Langzeiterkrankung, Wiedereingliederung, Arbeitsplatzanpassung, krankheitsbedingte Kündigung.',
    tags: ['BEM', 'Arbeitsunfähigkeit', 'Wiedereingliederung', 'Datenschutz']
  },
  {
    id: 'advisor-sgb-ix-168',
    source: 'SGB IX',
    paragraph: '§ 168 SGB IX',
    title: 'Zustimmung des Integrationsamts bei Kündigung',
    shortText: 'Die Kündigung schwerbehinderter Menschen braucht grundsätzlich vorherige Zustimmung des Integrationsamts.',
    sbvMeaning: 'SBV muss sofort prüfen, ob Anhörung, Unterlagen, Prävention und BEM sauber erfolgt sind.',
    practiceNote: 'Fristen und Unterlagen eng führen. Bei fehlender SBV-Beteiligung Rechtsverletzung dokumentieren und anwaltlich prüfen lassen.',
    typicalCases: 'Kündigungsanhörung, Zustimmung Integrationsamt, krankheitsbedingte Kündigung, außerordentliche Kündigung.',
    tags: ['Kündigung', 'Integrationsamt', 'Sonderkündigungsschutz', 'Frist']
  },
  {
    id: 'advisor-sgb-ix-178-1',
    source: 'SGB IX',
    paragraph: '§ 178 Abs. 1 SGB IX',
    title: 'Aufgaben der SBV',
    shortText: 'Die SBV fördert die Eingliederung, vertritt Interessen und überwacht die Einhaltung der Schutzvorschriften.',
    sbvMeaning: 'Grundlage für aktives Handeln: beraten, überwachen, Anträge unterstützen, Maßnahmen anstoßen.',
    practiceNote: 'Nicht auf Beschwerden warten. Bei erkennbarer Betroffenheit Informationen anfordern und Beteiligung einfordern.',
    typicalCases: 'Beratung, GdB-Antrag, Arbeitgeberpflichten, Überwachung, Maßnahmenanstoß.',
    tags: ['SBV-Aufgaben', 'Überwachung', 'Beratung', 'Interessenvertretung']
  },
  {
    id: 'advisor-sgb-ix-178-2',
    source: 'SGB IX',
    paragraph: '§ 178 Abs. 2 SGB IX',
    title: 'Unterrichtung und Anhörung der SBV',
    shortText: 'Die SBV ist in allen Angelegenheiten schwerbehinderter Menschen unverzüglich und umfassend zu unterrichten und vor Entscheidungen anzuhören.',
    sbvMeaning: 'Zentraler Beteiligungsanspruch der SBV. Ohne vorherige Anhörung ist die Beteiligung nicht ordnungsgemäß.',
    practiceNote: 'Bei Verstößen schriftlich rügen, Unterlagen anfordern, Nachholung verlangen und Vorgang dokumentieren.',
    typicalCases: 'Versetzung, Kündigung, Stellenbesetzung, Arbeitszeit, Homeoffice, Organisationsänderung.',
    tags: ['Anhörung', 'Unterrichtung', 'Beteiligung', 'SBV-Rechte']
  },
  {
    id: 'advisor-sgb-ix-179',
    source: 'SGB IX',
    paragraph: '§ 179 SGB IX',
    title: 'Persönliche Rechte und Ressourcen der SBV',
    shortText: 'Regelt Schutz, Freistellung, Schulung, Kosten und Amtsausstattung der SBV.',
    sbvMeaning: 'Grundlage für Schulungen, Arbeitsmittel, Zeitaufwand und unabhängige Amtsführung.',
    practiceNote: 'Erforderlichkeit sachlich begründen. SBV-Zeit ist Amtszeit, keine normale Arbeitsaufgabe.',
    typicalCases: 'Schulung, Ausstattung, Freistellung, Zeitbuchung, Stellvertretung.',
    tags: ['Schulung', 'Kosten', 'Freistellung', 'Ausstattung']
  },
  {
    id: 'advisor-sgb-ix-182',
    source: 'SGB IX',
    paragraph: '§ 182 SGB IX',
    title: 'Zusammenarbeit',
    shortText: 'Arbeitgeber, Inklusionsbeauftragte, Betriebsrat und SBV sollen eng zusammenarbeiten.',
    sbvMeaning: 'Kooperation ja, Unterordnung nein. Die SBV bleibt eigenständige Interessenvertretung.',
    practiceNote: 'Zusammenarbeit strukturiert einfordern: feste Termine, klare Unterlagen, verbindliche Rückmeldungen.',
    typicalCases: 'Regeltermine, Arbeitgebergespräche, Inklusionsvereinbarung, Konflikte mit HR.',
    tags: ['Zusammenarbeit', 'Inklusionsbeauftragter', 'Betriebsrat', 'Arbeitgeber']
  },
  {
    id: 'advisor-sgb-ix-185',
    source: 'SGB IX',
    paragraph: '§ 185 SGB IX',
    title: 'Aufgaben des Integrationsamts',
    shortText: 'Das Integrationsamt unterstützt Teilhabe im Arbeitsleben, Prävention und Kündigungsschutz.',
    sbvMeaning: 'Wichtiger externer Hebel bei Arbeitsplatzanpassung, Konflikten und Präventionsverfahren.',
    practiceNote: 'Frühzeitig einschalten, wenn interne Klärung stockt oder Arbeitgebermaßnahmen ausbleiben.',
    typicalCases: 'Technische Hilfen, Prävention, Kündigung, Beratung, begleitende Hilfe.',
    tags: ['Integrationsamt', 'Förderung', 'Prävention', 'Kündigungsschutz']
  },
  {
    id: 'advisor-betrvg-80',
    source: 'BetrVG',
    paragraph: '§ 80 BetrVG',
    title: 'Allgemeine Aufgaben des Betriebsrats',
    shortText: 'Der Betriebsrat überwacht Gesetze und fördert u. a. Eingliederung schwerbehinderter Menschen.',
    sbvMeaning: 'Schnittstelle zur SBV, aber kein Ersatz für SBV-Beteiligung.',
    practiceNote: 'Bei Doppelrelevanz parallel denken: BR-Mitbestimmung und SBV-Anhörung sind getrennte Rechte.',
    typicalCases: 'Betriebsvereinbarung, Überwachung, Beschwerden, Gleichbehandlung.',
    tags: ['Betriebsrat', 'Überwachung', 'Schnittstelle', 'Mitbestimmung']
  },
  {
    id: 'advisor-betrvg-87',
    source: 'BetrVG',
    paragraph: '§ 87 BetrVG',
    title: 'Mitbestimmung in sozialen Angelegenheiten',
    shortText: 'Mitbestimmung u. a. bei Arbeitszeit, Ordnung, technischen Einrichtungen und Gesundheitsschutz.',
    sbvMeaning: 'SBV prüft zusätzlich, ob schwerbehinderte Menschen besonders betroffen sind.',
    practiceNote: 'Bei BV-Themen SBV-Perspektive früh einbringen: Barrierefreiheit, Ausnahmen, Nachteilsausgleich.',
    typicalCases: 'Arbeitszeit, Zeiterfassung, mobiles Arbeiten, Gesundheitsschutz, IT-Systeme.',
    tags: ['Mitbestimmung', 'Arbeitszeit', 'IT-Systeme', 'Gesundheitsschutz']
  },
  {
    id: 'advisor-betrvg-99',
    source: 'BetrVG',
    paragraph: '§ 99 BetrVG',
    title: 'Personelle Einzelmaßnahmen',
    shortText: 'Betriebsrat ist bei Einstellung, Eingruppierung, Umgruppierung und Versetzung zu beteiligen.',
    sbvMeaning: 'SBV-Beteiligung nach § 178 Abs. 2 SGB IX läuft daneben, wenn schwerbehinderte Menschen betroffen sind.',
    practiceNote: 'Nicht auf BR-Unterlagen verlassen. SBV hat eigenen Unterrichtungs- und Anhörungsanspruch.',
    typicalCases: 'Einstellung, Versetzung, Eingruppierung, Umorganisation.',
    tags: ['Versetzung', 'Einstellung', 'Eingruppierung', 'BR']
  },
  {
    id: 'advisor-betrvg-102',
    source: 'BetrVG',
    paragraph: '§ 102 BetrVG',
    title: 'Anhörung des Betriebsrats bei Kündigung',
    shortText: 'Der Betriebsrat ist vor jeder Kündigung anzuhören.',
    sbvMeaning: 'Bei schwerbehinderten Menschen zusätzlich SBV-Anhörung und Integrationsamtsverfahren prüfen.',
    practiceNote: 'SBV sollte Kündigungsgründe, BEM, Prävention, Alternativen und leidensgerechte Beschäftigung prüfen.',
    typicalCases: 'Kündigung, Änderungskündigung, Anhörung, Frist.',
    tags: ['Kündigung', 'BR-Anhörung', 'SBV-Anhörung', 'Frist']
  },
  {
    id: 'advisor-agg-7',
    source: 'AGG',
    paragraph: '§ 7 AGG',
    title: 'Benachteiligungsverbot',
    shortText: 'Beschäftigte dürfen wegen geschützter Merkmale, u. a. Behinderung, nicht benachteiligt werden.',
    sbvMeaning: 'Wichtig bei Auswahlentscheidungen, Umgang mit Einschränkungen und fehlenden angemessenen Vorkehrungen.',
    practiceNote: 'Indizien zeitnah dokumentieren: Vergleichsfälle, Aussagen, Abläufe, fehlende Prüfung von Alternativen.',
    typicalCases: 'Bewerbung, Mobbing, Beförderung, Arbeitsplatzanpassung, Ausschluss von Leistungen.',
    tags: ['Diskriminierung', 'Behinderung', 'Benachteiligung', 'AGG']
  },
  {
    id: 'advisor-agg-15',
    source: 'AGG',
    paragraph: '§ 15 AGG',
    title: 'Entschädigung und Schadensersatz',
    shortText: 'Bei Benachteiligung können Entschädigungs- und Schadensersatzansprüche entstehen.',
    sbvMeaning: 'Relevanz für taktische Einschätzung und Hinweis auf anwaltliche Beratung.',
    practiceNote: 'Fristen sind kritisch. SBV sollte nicht selbst Rechtsvertretung übernehmen, sondern sauber dokumentieren.',
    typicalCases: 'Diskriminierung, Bewerbungsverfahren, Entschädigungsfrist, Vergleich.',
    tags: ['Entschädigung', 'Schadensersatz', 'Frist', 'AGG']
  },
  {
    id: 'advisor-agg-22',
    source: 'AGG',
    paragraph: '§ 22 AGG',
    title: 'Beweislast',
    shortText: 'Indizien für Benachteiligung können die Beweislast zulasten des Arbeitgebers verschieben.',
    sbvMeaning: 'Dokumentation ist entscheidend. Einzelne Aussagen oder Verfahrensfehler können wichtig werden.',
    practiceNote: 'Sachverhalt chronologisch sichern und Vermutungsindizien getrennt von Bewertungen erfassen.',
    typicalCases: 'Bewerbung, Benachteiligung wegen Behinderung, fehlende Beteiligung, ungünstige Behandlung.',
    tags: ['Beweislast', 'Indizien', 'Dokumentation', 'AGG']
  },
  {
    id: 'advisor-kschg-1',
    source: 'KSchG',
    paragraph: '§ 1 KSchG',
    title: 'Soziale Rechtfertigung der Kündigung',
    shortText: 'Kündigungen müssen sozial gerechtfertigt sein, wenn Kündigungsschutz greift.',
    sbvMeaning: 'Bei schwerbehinderten Menschen immer Alternativen, Anpassungen, BEM und Prävention prüfen.',
    practiceNote: 'SBV sollte auf mildere Mittel, leidensgerechte Beschäftigung und fehlende Prävention hinweisen.',
    typicalCases: 'Krankheitsbedingte Kündigung, personenbedingte Kündigung, Änderungskündigung.',
    tags: ['Kündigung', 'KSchG', 'mildere Mittel', 'BEM']
  },
  {
    id: 'advisor-arbschg-3',
    source: 'ArbSchG',
    paragraph: '§ 3 ArbSchG',
    title: 'Grundpflichten des Arbeitgebers',
    shortText: 'Arbeitgeber müssen erforderliche Arbeitsschutzmaßnahmen treffen und auf Wirksamkeit prüfen.',
    sbvMeaning: 'Nützlich bei Überlastung, psychischer Gefährdung und fehlender Anpassung der Arbeitsbedingungen.',
    practiceNote: 'Nicht nur Einzelfall beschreiben, sondern konkrete Maßnahme und Wirksamkeitsprüfung verlangen.',
    typicalCases: 'Überlastung, psychische Belastung, Organisation, Arbeitsmittel, Gesundheitsschutz.',
    tags: ['Arbeitsschutz', 'Überlastung', 'Wirksamkeitsprüfung', 'Gesundheit']
  },
  {
    id: 'advisor-arbschg-5',
    source: 'ArbSchG',
    paragraph: '§ 5 ArbSchG',
    title: 'Gefährdungsbeurteilung',
    shortText: 'Arbeitgeber müssen Gefährdungen beurteilen, einschließlich psychischer Belastungen.',
    sbvMeaning: 'Starker Bezug zu Prävention, Arbeitsplatzgestaltung und Belastungsfällen.',
    practiceNote: 'Bei Einzelfällen prüfen, ob die Gefährdungsbeurteilung aktuell, konkret und wirksam ist.',
    typicalCases: 'Psychische Belastung, Arbeitsverdichtung, Arbeitsplatzgestaltung, Homeoffice, Teamkonflikt.',
    tags: ['Gefährdungsbeurteilung', 'psychische Belastung', 'Arbeitsplatz', 'Prävention']
  },
  {
    id: 'advisor-arbschg-6',
    source: 'ArbSchG',
    paragraph: '§ 6 ArbSchG',
    title: 'Dokumentation des Arbeitsschutzes',
    shortText: 'Arbeitgeber müssen Gefährdungsbeurteilung, Maßnahmen und Überprüfung dokumentieren.',
    sbvMeaning: 'Hilft, wenn Arbeitgeber nur mündlich behauptet, alles sei geprüft.',
    practiceNote: 'Dokumente anfordern: Ergebnis, Maßnahme, Verantwortliche, Frist, Wirksamkeitskontrolle.',
    typicalCases: 'Gefährdungsbeurteilung, Prävention, Überlastung, Arbeitsplatzanpassung.',
    tags: ['Dokumentation', 'Arbeitsschutz', 'Nachweis', 'Gefährdung']
  }
] as LegalNormRecord[];

function normalizeKnowledgeText(value: string): string {
  return value.toLocaleLowerCase('de-DE');
}

function knowledgeSearchText(norm: LegalNormRecord): string {
  return normalizeKnowledgeText([
    norm.source,
    norm.paragraph,
    norm.title,
    norm.shortText,
    norm.sbvMeaning,
    norm.practiceNote,
    norm.typicalCases,
    ...(norm.tags ?? [])
  ].filter(Boolean).join(' '));
}

function mergeKnowledgeNorms(remoteRows: LegalNormRecord[]): LegalNormRecord[] {
  const byKey = new Map<string, LegalNormRecord>();
  for (const norm of [...SBV_ADVISOR_KNOWLEDGE_ENTRIES, ...remoteRows]) {
    const key = `${norm.source}::${norm.paragraph}`.toLocaleLowerCase('de-DE');
    byKey.set(key, { ...byKey.get(key), ...norm });
  }
  return [...byKey.values()].sort((a, b) => `${a.source} ${a.paragraph}`.localeCompare(`${b.source} ${b.paragraph}`, 'de-DE', { numeric: true }));
}

function filterKnowledgeNorms(rows: LegalNormRecord[], query: string, source: string): LegalNormRecord[] {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(normalizeKnowledgeText);
  return rows.filter((norm) => {
    if (source && norm.source !== source) return false;
    const haystack = knowledgeSearchText(norm);
    return terms.every((term) => haystack.includes(term));
  });
}

function KnowledgeView({ cases }: { cases: CaseRecord[] }) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [norms, setNorms] = useState<LegalNormRecord[]>([]);
  const [allKnowledgeNorms, setAllKnowledgeNorms] = useState<LegalNormRecord[]>([]);
  const [selectedNormId, setSelectedNormId] = useState('');
  const [caseReferences, setCaseReferences] = useState<CaseLegalReferenceRecord[]>([]);
  const [comments, setComments] = useState<NormCommentRecord[]>([]);
  const [caseLaw, setCaseLaw] = useState<CaseLawRecord[]>([]);
  const [checklist, setChecklist] = useState<NormChecklistItemRecord[]>([]);
  const [linkCaseId, setLinkCaseId] = useState('');
  const [commentTitle, setCommentTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [caseLawCourt, setCaseLawCourt] = useState('');
  const [caseLawFileNumber, setCaseLawFileNumber] = useState('');
  const [caseLawHolding, setCaseLawHolding] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedNorm = useMemo(() => norms.find((norm) => norm.id === selectedNormId), [norms, selectedNormId]);
  const sources = useMemo(() => [...new Set(allKnowledgeNorms.map((norm) => norm.source))].sort((a, b) => a.localeCompare(b)), [allKnowledgeNorms]);

  async function loadNorms(nextQuery = query, nextSource = source) {
    setError('');
    try {
      const bridge = await waitForBridge();
      let remoteRows: LegalNormRecord[] = [];
      if (bridge?.knowledge) {
        remoteRows = await bridge.knowledge.listNorms({ limit: 800 });
      }
      const mergedRows = mergeKnowledgeNorms(remoteRows);
      const filteredRows = filterKnowledgeNorms(mergedRows, nextQuery, nextSource);
      setAllKnowledgeNorms(mergedRows);
      setNorms(filteredRows);
      if (!selectedNormId && filteredRows.length) setSelectedNormId(filteredRows[0].id);
      if (selectedNormId && !filteredRows.some((norm) => norm.id === selectedNormId)) setSelectedNormId(filteredRows[0]?.id ?? '');
    } catch (error) {
      const fallbackRows = filterKnowledgeNorms(SBV_ADVISOR_KNOWLEDGE_ENTRIES, nextQuery, nextSource);
      setAllKnowledgeNorms(SBV_ADVISOR_KNOWLEDGE_ENTRIES);
      setNorms(fallbackRows);
      if (!selectedNormId && fallbackRows.length) setSelectedNormId(fallbackRows[0].id);
      if (selectedNormId && !fallbackRows.some((norm) => norm.id === selectedNormId)) setSelectedNormId(fallbackRows[0]?.id ?? '');
      setError(error instanceof Error ? `${error.message} Lokaler SBV-Ratgeber wurde geladen.` : 'Wissensdienst nicht erreichbar. Lokaler SBV-Ratgeber wurde geladen.');
    }
  }

  async function loadDetails(normId: string) {
    if (!normId) {
      setCaseReferences([]);
      setComments([]);
      setCaseLaw([]);
      setChecklist([]);
      return;
    }
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      const allCaseReferences = await Promise.all(cases.map((record) => bridge.knowledge.listCaseReferences(record.id)));
      const [commentRows, caseLawRows, checklistRows] = await Promise.all([
        bridge.knowledge.listComments(normId),
        bridge.knowledge.listCaseLaw(normId),
        bridge.knowledge.listChecklist(normId)
      ]);
      setCaseReferences(allCaseReferences.flat().filter((reference) => reference.legalNormId === normId));
      setComments(commentRows);
      setCaseLaw(caseLawRows);
      setChecklist(checklistRows);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Details konnten nicht geladen werden.');
    }
  }

  useEffect(() => {
    void loadNorms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDetails(selectedNormId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNormId, cases.length]);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadNorms(query, source);
  }

  async function linkSelectedNormToCase() {
    setMessage('');
    setError('');
    if (!selectedNorm || !linkCaseId) {
      setError('Bitte Norm und Fall auswählen.');
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.linkNormToCase({ caseId: linkCaseId, legalNormId: selectedNorm.id, note: 'Im Wissensmodul verknüpft.' });
      setMessage(`Rechtsbezug ${selectedNorm.paragraph} wurde mit der Fallakte verknüpft.`);
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rechtsbezug konnte nicht verknüpft werden.');
    }
  }

  async function createCommentForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createComment({ legalNormId: selectedNorm.id, title: commentTitle, content: commentText });
      setCommentTitle('');
      setCommentText('');
      setMessage('Kommentar gespeichert.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kommentar konnte nicht gespeichert werden.');
    }
  }

  async function createCaseLawForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createCaseLaw({ legalNormId: selectedNorm.id, court: caseLawCourt, fileNumber: caseLawFileNumber, shortHolding: caseLawHolding });
      setCaseLawCourt('');
      setCaseLawFileNumber('');
      setCaseLawHolding('');
      setMessage('Rechtsprechungsnotiz gespeichert.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rechtsprechungsnotiz konnte nicht gespeichert werden.');
    }
  }

  async function createChecklistItemForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createChecklistItem({ legalNormId: selectedNorm.id, text: checklistText, sortOrder: checklist.length + 1 });
      setChecklistText('');
      setMessage('Checklisteneintrag ergänzt.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Checklisteneintrag konnte nicht gespeichert werden.');
    }
  }

  return (
    <ModuleFrame title="Wissensdatenbank" kicker="SBV-Kompass" description="Kurze Ratgebertexte zu SBV-relevanten Normen, Pflichten und Handlungsoptionen. In Protokollen mit §§ einfügen.">
      <section className="industrial-panel">
        <form onSubmit={runSearch} className="knowledge-search-bar">
          <Search className="h-4 w-4 text-yellow-300" />
          <input className="industrial-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Norm, Stichwort oder Praxisbegriff suchen …" />
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">alle Quellen</option>
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="submit" className="industrial-button">Suchen</button>
        </form>
      </section>

      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      {message && <div className="industrial-message industrial-message-ok">{message}</div>}

      <section className="knowledge-layout">
        <aside className="industrial-panel">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Normen</p><h2>Register</h2><p className="industrial-meta">{norms.length} Treffer</p></div></div>
          <div className="knowledge-register-list">
            {norms.map((norm) => (
              <button key={norm.id} type="button" className={`knowledge-register-row ${selectedNormId === norm.id ? 'active' : ''}`} onClick={() => setSelectedNormId(norm.id)}>
                <strong>{norm.paragraph}</strong>
                <span>{norm.title}</span>
                <small>{norm.source} · {norm.tags.slice(0, 3).join(', ')}</small>
              </button>
            ))}
            {!norms.length && <div className="industrial-empty compact">Keine Normen gefunden.</div>}
          </div>
        </aside>

        <section className="industrial-panel knowledge-detail-panel">
          {!selectedNorm && <div className="industrial-empty">Norm auswählen.</div>}
          {selectedNorm && (
            <>
              <div className="industrial-panel-header compact">
                <div>
                  <p className="industrial-kicker">{selectedNorm.source}</p>
                  <h2>{selectedNorm.paragraph} · {selectedNorm.title}</h2>
                  <p>{selectedNorm.shortText}</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="industrial-subpanel"><h4>SBV-Bedeutung</h4><p>{selectedNorm.sbvMeaning ?? 'Noch nicht ergänzt.'}</p></div>
                <div className="industrial-subpanel"><h4>Praxishinweis</h4><p>{selectedNorm.practiceNote ?? 'Noch nicht ergänzt.'}</p></div>
                <div className="industrial-subpanel"><h4>Typische Fälle</h4><p>{selectedNorm.typicalCases ?? 'Noch nicht ergänzt.'}</p></div>
                <div className="industrial-subpanel"><h4>Tags</h4><p>{selectedNorm.tags.join(', ') || '—'}</p></div>
              </div>

              <details className="industrial-subpanel mt-4 knowledge-case-link">
                <summary>Mit Fallakte verknüpfen</summary>
                <div className="industrial-form-grid compact">
                  <select value={linkCaseId} onChange={(event) => setLinkCaseId(event.target.value)}>
                    <option value="">Fall auswählen</option>
                    {cases.map((record) => <option key={record.id} value={record.id}>{record.caseNumber} · {record.displayName}</option>)}
                  </select>
                  <button type="button" className="industrial-button" onClick={() => void linkSelectedNormToCase()}>Rechtsbezug setzen</button>
                </div>
                <div className="mt-3">
                  {caseReferences.map((reference) => <p key={reference.id} className="industrial-meta"><strong>{reference.caseNumber}</strong> · {reference.createdAt.slice(0, 10)}</p>)}
                  {!caseReferences.length && <p className="industrial-meta">Noch keine Fallverknüpfung.</p>}
                </div>
              </details>

              <div className="grid gap-4 xl:grid-cols-3 mt-4">
                <section className="industrial-subpanel">
                  <h4>Checkliste</h4>
                  {checklist.map((item) => <p key={item.id} className="industrial-meta">□ {item.text}</p>)}
                  <form onSubmit={createChecklistItemForNorm} className="industrial-settings-form compact"><input value={checklistText} onChange={(event) => setChecklistText(event.target.value)} placeholder="Checklisteneintrag" /><button className="industrial-secondary-button" type="submit">Ergänzen</button></form>
                </section>
                <section className="industrial-subpanel">
                  <h4>Eigene Kommentare</h4>
                  {comments.map((comment) => <p key={comment.id} className="industrial-meta"><strong>{comment.title}</strong><br />{comment.content}</p>)}
                  <form onSubmit={createCommentForNorm} className="industrial-settings-form compact"><input value={commentTitle} onChange={(event) => setCommentTitle(event.target.value)} placeholder="Titel" /><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Kommentar" /><button className="industrial-secondary-button" type="submit">Speichern</button></form>
                </section>
                <section className="industrial-subpanel">
                  <h4>Rechtsprechung</h4>
                  {caseLaw.map((item) => <p key={item.id} className="industrial-meta"><strong>{item.court}, {item.fileNumber}</strong><br />{item.shortHolding}</p>)}
                  <form onSubmit={createCaseLawForNorm} className="industrial-settings-form compact"><input value={caseLawCourt} onChange={(event) => setCaseLawCourt(event.target.value)} placeholder="Gericht" /><input value={caseLawFileNumber} onChange={(event) => setCaseLawFileNumber(event.target.value)} placeholder="Aktenzeichen" /><textarea value={caseLawHolding} onChange={(event) => setCaseLawHolding(event.target.value)} placeholder="Kurzleitsatz / Relevanz" /><button className="industrial-secondary-button" type="submit">Speichern</button></form>
                </section>
              </div>
            </>
          )}
        </section>
      </section>
    </ModuleFrame>
  );
}


const templateCategoryLabels: Record<TemplateCategory, string> = {
  praevention: 'Prävention',
  bem: 'BEM',
  beteiligung: 'SBV-Beteiligung',
  kuendigung: 'Kündigung',
  gleichstellung: 'Gleichstellung',
  auskunft: 'Auskunft',
  frist: 'Frist / Erinnerung',
  datenschutz: 'Datenschutz',
  sonstiges: 'Sonstiges'
};


function ContextualTemplateButton({
  action,
  caseId,
  sourceId,
  values
}: {
  action: ContextualTemplateAction;
  caseId: string;
  sourceId?: string;
  values?: Record<string, string>;
}) {
  const [rendered, setRendered] = useState<RenderedTemplateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();

  async function generate() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      const result = await bridge.templates.renderContext({
        templateKey: action.templateKey,
        caseId,
        sourceType: action.sourceType,
        sourceId,
        sourceLabel: action.description,
        values,
        archive: true
      });
      setRendered(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Schreiben konnte nicht erzeugt werden.');
    } finally {
      setBusy(false);
    }
  }

  async function copyRendered() {
    if (!rendered) return;
    const text = `Betreff: ${rendered.subject}\n\n${rendered.body}`;
    const scan = scanSensitiveExportText(text, { context: 'Vorlagenexport', target: rendered.title });
    const confirmed = await confirmDialog({
      variant: 'warning',
      title: 'Entwurf in Zwischenablage kopieren?',
      message: buildExportWarningMessage(scan),
      confirmLabel: 'Kopieren',
      cancelLabel: 'Abbrechen'
    });
    if (!confirmed) return;
    await navigator.clipboard.writeText(text);
    const successMessage = 'Entwurf wurde in die Zwischenablage kopiert. Achtung: Die Zwischenablage liegt außerhalb des Tresors.';
    setMessage(successMessage);
    announce(successMessage, 'polite');
  }

  return (
    <>
      <button type="button" className="industrial-inline-link" onClick={() => void generate()} disabled={busy || !caseId} title={action.description}>
        {busy ? 'Schreiben wird erzeugt …' : action.label}
      </button>
      {error && <span className="industrial-inline-warning">{error}</span>}
      {rendered && (
        <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
          <section className="industrial-modal industrial-modal-wide">
            <div className="industrial-panel-header compact">
              <div>
                <p className="industrial-kicker">Kontextschreiben</p>
                <h2>{rendered.title}</h2>
                <p>Dieser Entwurf wurde aus dem aktuellen Vorgang erzeugt und der Fallakte zugeordnet.</p>
              </div>
            </div>
            {!!rendered.unresolvedPlaceholders.length && (
              <div className="industrial-message industrial-message-warning mt-4">{missingPlaceholderWarning(rendered.unresolvedPlaceholders)}</div>
            )}
            {message && <div className="industrial-message industrial-message-ok mt-4">{message}</div>}
            <div className="industrial-subpanel mt-4">
              <h4>Betreff</h4>
              <p>{rendered.subject}</p>
            </div>
            <div className="industrial-subpanel mt-4 template-preview-body">
              <h4>Textvorschau</h4>
              <pre>{rendered.body}</pre>
            </div>
            <div className="industrial-modal-actions">
              <button type="button" className="industrial-secondary-button" onClick={() => setRendered(null)}>Schließen</button>
              <button type="button" className="industrial-button" onClick={() => void copyRendered()}>In Zwischenablage kopieren</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function TemplatesView({ cases }: { cases: CaseRecord[] }) {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | ''>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [sbvName, setSbvName] = useState('Schwerbehindertenvertretung');
  const [recipientName, setRecipientName] = useState('Personalabteilung');
  const [rendered, setRendered] = useState<RenderedTemplateResult | null>(null);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [newTemplate, setNewTemplate] = useState<CreateTemplateInput>({
    title: '',
    category: 'sonstiges',
    subject: '',
    body: '',
    description: '',
    legalBasis: [],
    tags: []
  });
  const [newTemplateProcessStatus, setNewTemplateProcessStatus] = useState<PreventionStatus | ''>('');
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [isTemplateHelpOpen, setIsTemplateHelpOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);
  const [editTemplateProcessStatus, setEditTemplateProcessStatus] = useState<PreventionStatus | ''>('');
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();


  async function loadTemplates(nextQuery = query, nextCategory = category) {
    const bridge = await waitForBridge();
    if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
    const rows = await bridge.templates.list({ query: nextQuery, category: nextCategory || undefined, limit: 300 });
    setTemplates(rows);
    if (!selectedTemplateId && rows[0]) setSelectedTemplateId(rows[0].id);
  }

  useEffect(() => {
    loadTemplates().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Vorlagen konnten nicht geladen werden.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? templates[0], [templates, selectedTemplateId]);

  async function applyFilters(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setInfo('');
    try {
      await loadTemplates(query, category);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Vorlagen konnten nicht geladen werden.');
    }
  }

  async function renderSelectedTemplate() {
    if (!selectedTemplate) return;
    setError('');
    setInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      const result = await bridge.templates.render({
        templateId: selectedTemplate.id,
        caseId: selectedCaseId || undefined,
        values: {
          'frist.datum': deadlineDate,
          'sbv.name': sbvName,
          'arbeitgeber.ansprechpartner': recipientName
        },
        archive: true
      });
      setRendered(result);
      setInfo('Entwurf wurde erzeugt und im geschützten Vorlagenverlauf archiviert.');
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : 'Vorlage konnte nicht erzeugt werden.');
    }
  }

  async function copyRenderedText() {
    if (!rendered) return;
    const text = `Betreff: ${rendered.subject}\n\n${rendered.body}`;
    const scan = scanSensitiveExportText(text, { context: 'Vorlagenexport', target: rendered.title });
    const confirmed = await confirmDialog({
      variant: 'warning',
      title: 'Entwurf in Zwischenablage kopieren?',
      message: buildExportWarningMessage(scan),
      confirmLabel: 'Kopieren',
      cancelLabel: 'Abbrechen'
    });
    if (!confirmed) return;
    try {
      await navigator.clipboard.writeText(text);
      const successMessage = 'Entwurf wurde in die Zwischenablage kopiert. Hinweis: Die Zwischenablage liegt außerhalb des Tresors.';
      setInfo(successMessage);
      announce(successMessage, 'polite');
    } catch {
      const errorMessage = 'Kopieren in die Zwischenablage war nicht möglich. Bitte den Text manuell markieren.';
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    }
  }

  async function createOwnTemplate(event: FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      const created = await bridge.templates.create({
        ...newTemplate,
        legalBasis: (newTemplate.legalBasis ?? []).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean),
        tags: [
          ...(newTemplate.tags ?? []).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean),
          ...(newTemplate.category === 'praevention' ? ['massnahme:prevention'] : []),
          ...(newTemplate.category === 'praevention' && newTemplateProcessStatus ? [`status:${newTemplateProcessStatus}`] : [])
        ].filter((entry, index, all) => all.indexOf(entry) === index)
      });
      setNewTemplate({ title: '', category: 'sonstiges', subject: '', body: '', description: '', legalBasis: [], tags: [] });
      setNewTemplateProcessStatus('');
      setIsCreateTemplateModalOpen(false);
      await loadTemplates(query, category);
      setSelectedTemplateId(created.id);
      setInfo('Eigene Vorlage wurde gespeichert.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Vorlage konnte nicht gespeichert werden.');
    }
  }

  function openEditTemplate(template: TemplateRecord) {
    setEditingTemplate({
      ...template,
      legalBasis: [...template.legalBasis],
      tags: [...template.tags]
    });
    const statusTag = template.tags.find((tag) => tag.startsWith('status:'));
    setEditTemplateProcessStatus(statusTag ? statusTag.replace('status:', '') as PreventionStatus : '');
    setRendered(null);
    setError('');
    setInfo('');
  }

  async function saveEditedTemplate(event: FormEvent) {
    event.preventDefault();
    if (!editingTemplate) return;
    setError('');
    setInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      const nextTags = [
        ...(editingTemplate.tags ?? []).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean).filter((entry) => !entry.startsWith('status:') && entry !== 'massnahme:prevention'),
        ...(editingTemplate.category === 'praevention' ? ['massnahme:prevention'] : []),
        ...(editingTemplate.category === 'praevention' && editTemplateProcessStatus ? [`status:${editTemplateProcessStatus}`] : [])
      ].filter((entry, index, all) => all.indexOf(entry) === index);

      const payload = {
        title: editingTemplate.title,
        category: editingTemplate.category,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        description: editingTemplate.description,
        legalBasis: (editingTemplate.legalBasis ?? []).flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean),
        tags: nextTags
      };

      if (bridge.templates.update) {
        await bridge.templates.update(editingTemplate.id, payload);
      } else {
        throw new Error('Vorlagenänderung wird von der Datenbrücke noch nicht unterstützt.');
      }
      setEditingTemplate(null);
      await loadTemplates(query, category);
      setSelectedTemplateId(editingTemplate.id);
      setInfo('Vorlage wurde aktualisiert.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Vorlage konnte nicht aktualisiert werden.');
    }
  }

  async function deleteTemplate(template: TemplateRecord) {
    const confirmed = await confirmDialog({
      variant: 'danger',
      title: 'Vorlage löschen?',
      message: `Die Vorlage „${template.title}“ wird dauerhaft gelöscht.`,
      confirmLabel: 'Vorlage löschen',
      cancelLabel: 'Abbrechen'
    });
    if (!confirmed) return;
    setError('');
    setInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      if (bridge.templates.delete) {
        await bridge.templates.delete(template.id);
      } else {
        throw new Error('Vorlagenlöschung wird von der Datenbrücke noch nicht unterstützt.');
      }
      if (selectedTemplateId === template.id) setSelectedTemplateId('');
      setRendered(null);
      await loadTemplates(query, category);
      setInfo('Vorlage wurde gelöscht.');
      announce('Vorlage wurde gelöscht.', 'polite');
    } catch (deleteError) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : 'Vorlage konnte nicht gelöscht werden.';
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    }
  }

  const categories = Object.keys(templateCategoryLabels) as TemplateCategory[];

  return (
    <ModuleFrame
      title="Vorlagen"
      kicker="Schriftverkehr"
      description="Standardschreiben mit Platzhaltern. Tonalität: freundlich, rechtlich klar, verbindlich und ohne unnötige Diskussionsöffnung."
    >
      <section className="industrial-panel">
        <div className="template-catalog-toolbar">
          <div className="template-title-cluster">
            <button
              type="button"
              className="template-help-button"
              onClick={() => setIsTemplateHelpOpen(true)}
              aria-label="Hilfe zu Vorlagen und Platzhaltern öffnen"
              title="Hilfe zu Platzhaltern"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <div>
              <p className="industrial-kicker">Auswahl</p>
              <h2>Vorlagenkatalog</h2>
            </div>
          </div>
          <button type="button" className="industrial-button" onClick={() => setIsCreateTemplateModalOpen(true)}>
            <Plus className="h-4 w-4" /> Neue Vorlage
          </button>
        </div>
        <form onSubmit={applyFilters} className="template-filter-form">
          <label><span>Suche</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Prävention, Beteiligung, Kündigung ..." /></label>
          <label><span>Kategorie</span><select value={category} onChange={(event) => setCategory(event.target.value as TemplateCategory | '')}><option value="">Alle</option>{categories.map((item) => <option key={item} value={item}>{templateCategoryLabels[item]}</option>)}</select></label>
          <button type="submit" className="industrial-secondary-button"><Search className="h-4 w-4" />Filtern</button>
        </form>
        {error && <div className="industrial-message industrial-message-warning mb-4">{error}</div>}
        {info && <div className="industrial-message mb-4">{info}</div>}
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className={`template-list-row ${selectedTemplate?.id === template.id ? 'active' : ''}`}>
                <button
                  type="button"
                  className="industrial-list-item template-list-main w-full text-left"
                  onClick={() => { setSelectedTemplateId(template.id); setRendered(null); }}
                >
                  <strong>{template.title}</strong>
                  <span>{templateCategoryLabels[template.category]} · {template.legalBasis.join(', ') || 'ohne Normbezug'}</span>
                  <p>{template.description}</p>
                </button>
                <button
                  type="button"
                  className="template-trash-button"
                  onClick={() => void deleteTemplate(template)}
                  aria-label={`Vorlage ${template.title} löschen`}
                  title="Vorlage löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!templates.length && <div className="industrial-empty">Keine Vorlage gefunden.</div>}
          </div>

          <div className="industrial-subpanel">
            {selectedTemplate ? (
              <>
                <div className="industrial-case-header">
                  <div>
                    <p className="industrial-kicker">{templateCategoryLabels[selectedTemplate.category]}</p>
                    <h2>{selectedTemplate.title}</h2>
                    <p>{selectedTemplate.description}</p>
                  </div>
                </div>

                <div className="template-detail-meta mt-4">
                  <div><span>Kategorie</span><strong>{templateCategoryLabels[selectedTemplate.category]}</strong></div>
                  <div><span>Normen</span><strong>{selectedTemplate.legalBasis.join(', ') || 'ohne Normbezug'}</strong></div>
                  <div><span>Tags</span><strong>{selectedTemplate.tags.join(', ') || 'keine Tags'}</strong></div>
                </div>

                <div className="industrial-subpanel mt-4">
                  <h4>Vorlagentext</h4>
                  <p className="industrial-meta"><strong>Betreff:</strong> {selectedTemplate.subject}</p>
                  <pre className="industrial-prewrap">{selectedTemplate.body}</pre>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" className="industrial-button" onClick={() => openEditTemplate(selectedTemplate)}><FileText className="h-4 w-4" />Vorlage bearbeiten</button>
                </div>
              </>
            ) : (
              <div className="industrial-empty">Bitte eine Vorlage auswählen.</div>
            )}
          </div>
        </div>
      </section>

      {isCreateTemplateModalOpen && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal template-create-modal" role="dialog" aria-modal="true" aria-labelledby="template-create-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Eigene Vorlage</p>
                <h2 id="template-create-title">Vorlage ergänzen</h2>
                <p>Neue Standardschreiben werden hier angelegt und können anschließend aus Fallakte oder Maßnahme heraus genutzt werden.</p>
              </div>
            </div>
        <form onSubmit={createOwnTemplate} className="template-create-form">
          <div className="template-form-grid">
            <label><span>Titel</span><input value={newTemplate.title} onChange={(event) => setNewTemplate((draft) => ({ ...draft, title: event.target.value }))} autoFocus /></label>
            <label><span>Kategorie</span><select value={newTemplate.category} onChange={(event) => setNewTemplate((draft) => ({ ...draft, category: event.target.value as TemplateCategory }))}>{categories.map((item) => <option key={item} value={item}>{templateCategoryLabels[item]}</option>)}</select></label>
            <label><span>Maßnahmenstatus</span><select value={newTemplateProcessStatus} onChange={(event) => setNewTemplateProcessStatus(event.target.value as PreventionStatus | '')} disabled={newTemplate.category !== 'praevention'}><option value="">alle / nicht gebunden</option>{preventionStatusOrder.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
            <label><span>Normen</span><input value={(newTemplate.legalBasis ?? []).join(', ')} onChange={(event) => setNewTemplate((draft) => ({ ...draft, legalBasis: [event.target.value] }))} placeholder="§ 178 Abs. 2 Satz 1 SGB IX" /></label>
            <label><span>Tags</span><input value={(newTemplate.tags ?? []).join(', ')} onChange={(event) => setNewTemplate((draft) => ({ ...draft, tags: [event.target.value] }))} placeholder="Beteiligung, Frist, HR" /></label>
          </div>
          <label><span>Beschreibung</span><input value={newTemplate.description ?? ''} onChange={(event) => setNewTemplate((draft) => ({ ...draft, description: event.target.value }))} /></label>
          <label><span>Betreff</span><input value={newTemplate.subject} onChange={(event) => setNewTemplate((draft) => ({ ...draft, subject: event.target.value }))} placeholder="Beteiligung der SBV – {{fall.aktenzeichen}}" /></label>
          <label><span>Text</span><textarea value={newTemplate.body} onChange={(event) => setNewTemplate((draft) => ({ ...draft, body: event.target.value }))} placeholder="Sehr geehrte Damen und Herren, ..." /></label>
          <div className="template-form-hint">Platzhalter kannst du über das Hilfe-Symbol im Vorlagenkatalog nachschlagen.</div>
          <div className="industrial-modal-actions">
            <button type="button" className="industrial-secondary-button" onClick={() => setIsCreateTemplateModalOpen(false)}>Abbrechen</button>
            <button type="submit" className="industrial-button"><Save className="h-4 w-4" />Vorlage speichern</button>
          </div>
        </form>
          </section>
        </div>
      )}
      {editingTemplate && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal template-create-modal" role="dialog" aria-modal="true" aria-labelledby="template-edit-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Vorlage bearbeiten</p>
                <h2 id="template-edit-title">{editingTemplate.title}</h2>
                <p>Text, Tags, Normen und Zuordnung dieser Vorlage ändern.</p>
              </div>
            </div>
            <form onSubmit={saveEditedTemplate} className="template-create-form">
              <div className="template-form-grid">
                <label><span>Titel</span><input value={editingTemplate.title} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, title: event.target.value } : draft)} autoFocus /></label>
                <label><span>Kategorie</span><select value={editingTemplate.category} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, category: event.target.value as TemplateCategory } : draft)}>{categories.map((item) => <option key={item} value={item}>{templateCategoryLabels[item]}</option>)}</select></label>
                <label><span>Maßnahmenstatus</span><select value={editTemplateProcessStatus} onChange={(event) => setEditTemplateProcessStatus(event.target.value as PreventionStatus | '')} disabled={editingTemplate.category !== 'praevention'}><option value="">alle / nicht gebunden</option>{preventionStatusOrder.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
                <label><span>Normen</span><input value={(editingTemplate.legalBasis ?? []).join(', ')} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, legalBasis: [event.target.value] } : draft)} placeholder="§ 178 Abs. 2 Satz 1 SGB IX" /></label>
                <label><span>Tags</span><input value={(editingTemplate.tags ?? []).filter((tag) => tag !== 'massnahme:prevention' && !tag.startsWith('status:')).join(', ')} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, tags: [event.target.value] } : draft)} placeholder="Beteiligung, Frist, HR" /></label>
              </div>
              <label><span>Beschreibung</span><input value={editingTemplate.description ?? ''} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, description: event.target.value } : draft)} /></label>
              <label><span>Betreff</span><input value={editingTemplate.subject} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, subject: event.target.value } : draft)} placeholder="Beteiligung der SBV – {{fall.aktenzeichen}}" /></label>
              <label><span>Text</span><textarea value={editingTemplate.body} onChange={(event) => setEditingTemplate((draft) => draft ? { ...draft, body: event.target.value } : draft)} placeholder="Sehr geehrte Damen und Herren, ..." /></label>
              <div className="template-form-hint">Bei Präventionsvorlagen werden die Tags <code>massnahme:prevention</code> und bei Statusbindung <code>status:...</code> automatisch gesetzt.</div>
              <div className="industrial-modal-actions">
                <button type="button" className="industrial-secondary-button" onClick={() => setEditingTemplate(null)}>Abbrechen</button>
                <button type="submit" className="industrial-button"><Save className="h-4 w-4" />Änderungen speichern</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {isTemplateHelpOpen && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal template-help-modal" role="dialog" aria-modal="true" aria-labelledby="template-help-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><HelpCircle className="h-5 w-5" /></div>
              <div>
                <p className="industrial-kicker">Hilfe</p>
                <h2 id="template-help-title">Platzhalter in Vorlagen</h2>
                <p>Platzhalter werden in doppelten geschweiften Klammern geschrieben. Allgemeine Werte wie SBV-Name oder Arbeitgeber-Ansprechstelle pflegst du unter Einstellungen → Vorlagen & Standardwerte.</p>
              </div>
            </div>
            <div className="template-placeholder-help">
              <section>
                <h3>Allgemein</h3>
                <code>{'{{heute}}'}</code>
                <p>Aktuelles Datum.</p>
                <code>{'{{sbv.name}}'}</code>
                <p>Name oder Funktionsbezeichnung der SBV als Absender.</p>
                <code>{'{{arbeitgeber.ansprechpartner}}'}</code>
                <p>Ansprechstelle des Arbeitgebers, z. B. Personalabteilung.</p>
              </section>
              <section>
                <h3>Fallakte</h3>
                <code>{'{{fall.aktenzeichen}}'}</code>
                <p>Aktenzeichen des ausgewählten Falls.</p>
                <code>{'{{fall.name}}'}</code>
                <p>Name oder Pseudonym aus der Fallakte.</p>
                <code>{'{{fall.kurzbeschreibung}}'}</code>
                <p>Kurzbeschreibung des Falls.</p>
                <code>{'{{person.name}}'}</code>
                <p>Personenbezug aus dem Fall, soweit vorhanden.</p>
              </section>
              <section>
                <h3>Fristen und Normen</h3>
                <code>{'{{frist.datum}}'}</code>
                <p>Datum, das beim Erzeugen des Schreibens eingetragen wurde.</p>
                <code>{'{{normen}}'}</code>
                <p>Normbezüge der Vorlage oder des Vorgangs.</p>
              </section>
              <section>
                <h3>Präventionsverfahren</h3>
                <code>{'{{praevention.status}}'}</code>
                <p>Aktueller Status der Maßnahme.</p>
                <code>{'{{praevention.gefaehrdung}}'}</code>
                <p>Dokumentierte Gefährdung oder Ausgangslage.</p>
                <code>{'{{praevention.arbeitgeberfrist}}'}</code>
                <p>Frist zur Arbeitgeberreaktion.</p>
                <code>{'{{praevention.massnahmen}}'}</code>
                <p>Geplante oder dokumentierte Maßnahmen.</p>
              </section>
            </div>
            <div className="template-help-example">
              <h3>Beispiel</h3>
              <pre>{'Bitte stellen Sie mir die Unterlagen zur Fallakte {{fall.aktenzeichen}} bis zum {{frist.datum}} zur Verfügung.'}</pre>
            </div>
            <div className="industrial-modal-actions">
              <button type="button" className="industrial-button" onClick={() => setIsTemplateHelpOpen(false)}>Schließen</button>
            </div>
          </section>
        </div>
      )}
    </ModuleFrame>
  );
}

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('loading');
  const [unlocked, setUnlocked] = useState(false);
  const [currentView, setCurrentView] = useState<ViewId>('dashboard');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineRecord[]>([]);
  const [dashboardDeadlines, setDashboardDeadlines] = useState<DeadlineDashboardItem[]>([]);
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineRecord | null>(null);
  const [dataError, setDataError] = useState('');
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [caseNodeTarget, setCaseNodeTarget] = useState<CaseNodeTarget | null>(null);

  const currentModule = useMemo(() => modules.find((module) => module.id === currentView), [currentView]);

  function openCaseNode(target: CaseNodeTarget) {
    setCaseNodeTarget(target);
    setCurrentView('cases');
  }


  useModalKeyboardShortcuts({ setCurrentView });

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Darstellung bleibt für die Sitzung aktiv, auch wenn Persistenz nicht möglich ist.
    }
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadSecurityStatus() {
      try {
        const bridge = await waitForBridge();
        if (!active) return;

        if (!bridge?.security) {
          setUnlocked(false);
          setAuthMode('unavailable');
          return;
        }

        const status = await bridge.security.status();
        if (!active) return;
        setUnlocked(status.unlocked);
        if (status.recoveryRequired) {
          setAuthMode('recovery');
        } else {
          setAuthMode(status.initialized ? 'login' : 'setup');
        }
      } catch (error) {
        console.error('Gremia.SBV security status failed', error);
        if (!active) return;
        setUnlocked(false);
        setAuthMode('unavailable');
      }
    }

    void loadSecurityStatus();

  return () => {
      active = false;
    };
  }, []);

  async function reloadWorkData() {
    const bridge = await waitForBridge();
    if (!bridge?.cases || !bridge.contacts || !bridge.deadlines) {
      throw new Error('Datenbrücke ist nicht geladen.');
    }
    const [caseRows, contactRows, deadlineRows, dashboardRows] = await Promise.all([
      bridge.cases.list(),
      bridge.contacts.list(),
      bridge.deadlines.list({ status: ['open', 'overdue'] }),
      bridge.deadlines.dashboard()
    ]);
    setCases(caseRows);
    setContacts(contactRows);
    setDeadlines(deadlineRows);
    setDashboardDeadlines(dashboardRows);
  }

  async function createCase(input: { caseNumber: string; displayName: string; category: CaseCategory; summary?: string }) {
    const bridge = await waitForBridge();
    if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
    await bridge.cases.create(input);
    await reloadWorkData();
  }

  async function createContact(input: CreateContactInput): Promise<ContactRecord> {
    const bridge = await waitForBridge();
    if (!bridge?.contacts) throw new Error('Kontaktdienst ist nicht erreichbar.');
    const created = await bridge.contacts.create(input);
    const contactRows = await bridge.contacts.list();
    setContacts(contactRows);
    return created;
  }

  async function deleteContact(contact: ContactRecord): Promise<DeleteContactResult> {
    const bridge = await waitForBridge();
    if (!bridge?.contacts) throw new Error('Kontaktdienst ist nicht erreichbar.');
    const result = await bridge.contacts.delete(contact.id);
    await reloadWorkData();
    return result;
  }

  async function createDeadline(input: CreateDeadlineInput) {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines) throw new Error('Fristendienst ist nicht erreichbar.');
    await bridge.deadlines.create(input);
    await reloadWorkData();
  }

  async function updateDeadline(id: string, input: { title: string; dueAt: string; severity: DeadlineSeverity; description?: string; legalBasis?: string; reason: string }) {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines) throw new Error('Fristendienst ist nicht erreichbar.');
    await bridge.deadlines.update(id, input);
    await reloadWorkData();
  }

  async function completeDeadline(deadline: DeadlineRecord) {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines) throw new Error('Fristendienst ist nicht erreichbar.');
    await bridge.deadlines.complete(deadline.id, 'Über Dashboard/Fristenregister als erledigt markiert.');
    setSelectedDeadline(null);
    await reloadWorkData();
  }

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    reloadWorkData().catch((error) => {
      console.error('Gremia.SBV work data load failed', error);
      if (active) setDataError(error instanceof Error ? error.message : 'Arbeitsdaten konnten nicht geladen werden.');
    });
    return () => {
      active = false;
    };
  }, [unlocked]);

  if (!unlocked) {
    return (
      <LoginGate
        mode={authMode}
        onUnlock={() => setUnlocked(true)}
        onResetToSetup={() => {
          setUnlocked(false);
          setAuthMode('setup');
        }}
      />
    );
  }

  return (
    <LiveRegionProvider>
      <ConfirmDialogProvider>
        <main className="industrial-shell min-h-screen text-zinc-100">
      <aside className="industrial-sidebar">
        <div className="brand-block">
          <div className="brand-mark">SBV</div>
          <div>
            <strong>Gremia.SBV</strong>
            <span>LOCAL</span>
          </div>
        </div>
        <ShellNav current={currentView} onNavigate={setCurrentView} />
        <button
          className="industrial-lock-button"
          onClick={async () => {
            try {
              await window.gremiaSbv?.security?.lock?.();
            } catch {
              // no-op
            }
            setUnlocked(false);
            setAuthMode('login');
            setCurrentView('dashboard');
          }}
        >
          <LogOut className="h-4 w-4" />
          Sperren
        </button>
        <div className="industrial-version-badge" aria-label={`Gremia.SBV Version ${APP_VERSION}`}>
          <span>Version</span>
          <strong>{APP_VERSION}</strong>
        </div>
      </aside>

      <section className="industrial-content">
        <header className="industrial-topbar">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">Arbeitsplatz</p>
            <h2>{currentView === 'dashboard' ? 'Dashboard' : currentView === 'settings' ? 'Einstellungen' : currentModule?.title}</h2>
          </div>
          <div className="industrial-state">
            <CheckCircle2 className="h-4 w-4 text-yellow-300" />
            entsperrt · {nowLabel()}
          </div>
        </header>

        {dataError && <div className="industrial-message industrial-message-warning mb-4">{dataError}</div>}
        {currentView === 'dashboard' && (
          <DashboardOverview
            onNavigate={setCurrentView}
            cases={cases}
            deadlines={deadlines}
            dashboardItems={dashboardDeadlines}
            onEditDeadline={(deadline) => setSelectedDeadline(deadline)}
            onCompleteDeadline={(deadline) => void completeDeadline(deadline)}
          />
        )}
        {currentView === 'cases' && <CasesView cases={cases} contacts={contacts} target={caseNodeTarget} onCreateCase={createCase} onCreateDeadline={createDeadline} onCreateContact={createContact} onCasesChanged={reloadWorkData} onTargetConsumed={() => setCaseNodeTarget(null)} />}
        {currentView === 'deadlines' && (
          <DeadlinesView
            cases={cases}
            deadlines={deadlines}
            onCreateDeadline={createDeadline}
            onEditDeadline={(deadline) => setSelectedDeadline(deadline)}
            onCompleteDeadline={(deadline) => void completeDeadline(deadline)}
          />
        )}
        {currentView === 'contacts' && <ContactsView contacts={contacts} onCreateContact={createContact} onDeleteContact={deleteContact} />}
        {currentView === 'knowledge' && <KnowledgeView cases={cases} />}
        {currentView === 'prevention' && <PreventionView cases={cases} onOpenCaseNode={openCaseNode} />}
        {currentView === 'templates' && <TemplatesView cases={cases} />}
        {currentView === 'reports' && <ReportsView />}
        {currentView === 'settings' && <SettingsView theme={theme} onThemeChange={setTheme} cases={cases} />}
        {currentView !== 'dashboard' && currentView !== 'cases' && currentView !== 'deadlines' && currentView !== 'contacts' && currentView !== 'knowledge' && currentView !== 'prevention' && currentView !== 'templates' && currentView !== 'reports' && currentView !== 'settings' && currentModule && (
          <PlaceholderView view={currentModule} />
        )}
        {selectedDeadline && (
          <DeadlineEditor
            deadline={selectedDeadline}
            cases={cases}
            onClose={() => setSelectedDeadline(null)}
            onSave={updateDeadline}
            onComplete={completeDeadline}
          />
        )}
      </section>
        </main>
      </ConfirmDialogProvider>
    </LiveRegionProvider>
  );
}
