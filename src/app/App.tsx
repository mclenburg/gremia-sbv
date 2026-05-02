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
  Users
} from 'lucide-react';
import { DashboardCard } from './shared/components/DashboardCard';
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

const APP_VERSION = '0.4.2';

type ViewId =
  | 'dashboard'
  | 'cases'
  | 'deadlines'
  | 'bem'
  | 'prevention'
  | 'equalization'
  | 'termination'
  | 'templates'
  | 'knowledge'
  | 'contacts'
  | 'reports'
  | 'portable'
  | 'settings';

interface ModuleDefinition {
  id: Exclude<ViewId, 'dashboard' | 'settings'>;
  title: string;
  shortTitle: string;
  text: string;
  icon: typeof FolderKanban;
  status?: string;
}


const modules: ModuleDefinition[] = [
  {
    id: 'cases',
    title: 'Fälle',
    shortTitle: 'Fallakte',
    text: 'Fallakte, Vorgang, Gesprächsnotizen und Protokolle.',
    icon: FolderKanban,
    status: 'Kernmodul'
  },
  {
    id: 'deadlines',
    title: 'Fristen',
    shortTitle: 'Frist',
    text: 'Fristen und Wiedervorlagen. Ab 48h zwingend auf dem Dashboard.',
    icon: CalendarClock,
    status: 'aktiv'
  },
  {
    id: 'bem',
    title: 'BEM',
    shortTitle: 'BEM',
    text: 'Einladung, Zustimmung, Maßnahmen, Evaluation.',
    icon: HeartPulse
  },
  {
    id: 'prevention',
    title: 'Präventionsverfahren',
    shortTitle: 'Prävention',
    text: 'Frühzeitige Aktivierung nach § 167 Abs. 1 SGB IX.',
    icon: ShieldAlert,
    status: 'neu'
  },
  {
    id: 'equalization',
    title: 'Gleichstellung',
    shortTitle: 'Gleichstellung',
    text: 'Antrag, Sachstand, Bescheid, Widerspruchsfrist.',
    icon: Scale
  },
  {
    id: 'termination',
    title: 'Kündigungsanhörung',
    shortTitle: 'Kündigung',
    text: 'Kritischer Workflow für SBV-Anhörung und Integrationsamt-Prüfung.',
    icon: ShieldAlert,
    status: 'kritisch'
  },
  {
    id: 'templates',
    title: 'Vorlagen',
    shortTitle: 'Vorlagen',
    text: 'Schriftverkehr, Platzhalter, Standardschreiben.',
    icon: FileText
  },
  {
    id: 'knowledge',
    title: 'Wissen',
    shortTitle: 'Wissen',
    text: 'Normen, Notizen, Fallverknüpfungen.',
    icon: BookOpen
  },
  {
    id: 'contacts',
    title: 'Kontakte',
    shortTitle: 'Kontakte',
    text: 'Inklusionsamt, Betriebsarzt, Agentur, Beratungsstellen.',
    icon: Users
  },
  {
    id: 'reports',
    title: 'Berichte',
    shortTitle: 'Berichte',
    text: 'Anonymisierte Tätigkeitsberichte und Auswertungen.',
    icon: BarChart3
  },
  {
    id: 'portable',
    title: 'Portabilität',
    shortTitle: 'USB',
    text: 'Datenpfad, Backup, tragbarer Betrieb.',
    icon: HardDrive
  }
];

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
          <DashboardCard key={module.id} {...module} onClick={() => onNavigate(module.id)} />
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
  | { type: 'search'; id: string };

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

function CasesView({
  cases,
  contacts,
  onCreateCase,
  onCreateDeadline,
  onCreateContact,
  onCasesChanged
}: {
  cases: CaseRecord[];
  contacts: ContactRecord[];
  onCreateCase: (input: { caseNumber: string; displayName: string; category: CaseCategory; summary?: string }) => Promise<void>;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
  onCasesChanged: () => Promise<void>;
}) {
  const [caseNumber, setCaseNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<CaseCategory>('bem');
  const [summary, setSummary] = useState('');
  const [caseFilter, setCaseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [notes, setNotes] = useState<CaseNoteRecord[]>([]);
  const [documents, setDocuments] = useState<CaseDocumentRecord[]>([]);
  const [caseLegalReferences, setCaseLegalReferences] = useState<CaseLegalReferenceRecord[]>([]);
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

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredCases.length / pageSize));
  const visibleCases = filteredCases.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);
  const selectedNote = selection.type === 'note' ? notes.find((note) => note.id === selection.id) : undefined;
  const selectedDocument = selection.type === 'document' ? documents.find((doc) => doc.id === selection.id) : undefined;
  const selectedSearchResult = selection.type === 'search' ? searchResults.find((result) => result.sourceId === selection.id) : undefined;

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
    setPage(1);
  }, [caseFilter]);

  useEffect(() => {
    if (!selectedCaseId) {
      setNotes([]);
      setDocuments([]);
      setCaseLegalReferences([]);
      return;
    }
    let active = true;
    async function loadCaseChildren() {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
        const [noteRows, docRows, legalRefRows] = await Promise.all([
          bridge.cases.listNotes(selectedCaseId),
          bridge.cases.listDocuments(selectedCaseId),
          bridge.knowledge?.listCaseReferences(selectedCaseId) ?? Promise.resolve([])
        ]);
        if (active) {
          setNotes(noteRows);
          setDocuments(docRows);
          setCaseLegalReferences(legalRefRows);
          setSelection({ type: 'overview' });
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
    const [noteRows, docRows, legalRefRows] = await Promise.all([
      bridge.cases.listNotes(selectedCaseId),
      bridge.cases.listDocuments(selectedCaseId),
      bridge.knowledge?.listCaseReferences(selectedCaseId) ?? Promise.resolve([])
    ]);
    setNotes(noteRows);
    setDocuments(docRows);
    setCaseLegalReferences(legalRefRows);
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
    const confirmed = window.confirm(
      'Dieses Dokument wird als Klartextkopie außerhalb des verschlüsselten Gremia.SBV-Tresors gespeichert. Fortfahren?'
    );
    if (!confirmed) return;
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      await bridge.cases.exportDocument(document.id, document.filename);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'Dokument konnte nicht exportiert werden.');
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
    <ModuleFrame
      title="Fallregister"
      kicker="Fallakte"
      description="Aktenzeichen, Person, Notizen, Protokolle, Dokumente und Volltextsuche in einer Fallakte."
    >
      <form onSubmit={addCase} className="industrial-form case-create-form">
        <label>
          <span>Aktenzeichen</span>
          <input value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} placeholder="z. B. BEM-2026-004" />
        </label>
        <label>
          <span>Name / Pseudonym</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name oder Pseudonym" />
        </label>
        <label>
          <span>Kategorie</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as CaseCategory)}>
            <option value="bem">BEM</option>
            <option value="praevention">Prävention</option>
            <option value="kuendigung">Kündigung</option>
            <option value="gleichstellung">Gleichstellung</option>
            <option value="gdb">GdB</option>
            <option value="nachteilsausgleich">Nachteilsausgleich</option>
            <option value="arbeitsplatzgestaltung">Arbeitsplatzgestaltung</option>
            <option value="diskriminierung">Diskriminierung</option>
            <option value="sonstiges">Sonstiges</option>
          </select>
        </label>
        <label>
          <span>Kurzbeschreibung</span>
          <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="knappe Sachebene" />
        </label>
        <button type="submit" className="industrial-button"><Plus className="h-4 w-4" />Fall anlegen</button>
      </form>
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}

      <section className="industrial-panel case-register-panel">
        <div className="case-register-toolbar">
          <div>
            <p className="industrial-kicker">Fallliste</p>
            <h2>Register</h2>
          </div>
          <input className="industrial-input" value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)} placeholder="Fälle filtern nach Aktenzeichen, Name, Kurzbeschreibung …" />
        </div>
        <div className="industrial-table-shell">
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
        <div className="case-pagination">
          <button type="button" className="industrial-secondary-button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Zurück</button>
          <span>Seite {Math.min(page, pageCount)} / {pageCount}</span>
          <button type="button" className="industrial-secondary-button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Weiter</button>
        </div>
      </section>

      <section className="case-workbench">
        <aside className="industrial-panel case-tree-panel">
          <p className="industrial-kicker">Ausgewählte Fallakte</p>
          <h2>{selectedCase?.caseNumber ?? 'Keine Auswahl'}</h2>
          <p className="industrial-meta">{selectedCase?.displayName ?? 'Bitte oben einen Fall auswählen.'}</p>
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
          <form onSubmit={runSearch} className="case-search-bar">
            <Search className="h-4 w-4 text-yellow-300" />
            <input className="industrial-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Volltextsuche in Notizen, Protokollen und Dokumenten …" />
            <label className="industrial-checkbox-row compact"><input type="checkbox" checked={searchOnlySelectedCase} onChange={(event) => setSearchOnlySelectedCase(event.target.checked)} /><span>nur diese Fallakte</span></label>
            <button type="submit" className="industrial-button">Suchen</button>
          </form>
          {searchError && <div className="industrial-message industrial-message-warning">{searchError}</div>}
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
              <div className="case-detail-metrics"><Metric label="Notizen" value={String(notes.length)} /><Metric label="Dokumente" value={String(documents.length)} /><Metric label="Rechtsbezüge" value={String(caseLegalReferences.length)} /><Metric label="Kategorie" value={selectedCase?.category ?? '—'} /></div>
            </div>
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

          <div className="case-detail-actions">
            <button type="button" className="industrial-button" disabled={!selectedCaseId} onClick={() => { resetNoteForm(); setSelection({ type: 'overview' }); }}><Plus className="h-4 w-4" />Neue Notiz</button>
            <button type="button" className="industrial-button" disabled={!selectedCaseId} onClick={openCaseDeadlineDraft}><CalendarPlus className="h-4 w-4" />Frist zum Fall</button>
            <button type="button" className="industrial-button" disabled={!selectedCaseId} onClick={() => void importDocuments()}><FileText className="h-4 w-4" />Dokument hinzufügen</button>
          </div>
          {documentError && <div className="industrial-message industrial-message-warning">{documentError}</div>}
        </section>
      </section>

      <section className="industrial-panel">
        <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Erfassen</p><h2>{editingNote ? 'Notiz / Protokoll bearbeiten' : 'Neue Gesprächsnotiz / neues Protokoll'}</h2></div></div>
        <form onSubmit={saveNote} className="industrial-form case-note-form">
          <label><span>Titel</span><input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="z. B. Erstgespräch" /></label>
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
                  <input
                    type="checkbox"
                    checked={linkedCaseIds.includes(record.id) || record.id === selectedCaseId}
                    disabled={record.id === selectedCaseId}
                    onChange={(event) => toggleLinkedCase(record.id, event.target.checked)}
                  />
                  <span>{record.caseNumber} · {record.displayName}</span>
                </label>
              ))}
            </div>
          </div>
          <label><span>Vertraulichkeit</span><select value={confidentialLevel} onChange={(event) => setConfidentialLevel(event.target.value as ConfidentialLevel)}><option value="normal">normal</option><option value="sensibel">sensibel</option><option value="hoch_sensibel">hoch sensibel</option></select></label>
          <label className="industrial-checkbox-row"><input type="checkbox" checked={containsHealthData} onChange={(event) => setContainsHealthData(event.target.checked)} /><span>enthält Gesundheits-/Behinderungsbezug</span></label>
          <div className="industrial-card-actions"><button type="button" className="industrial-secondary-button" onClick={resetNoteForm}>Zurücksetzen</button><button type="submit" className="industrial-button"><Save className="h-4 w-4" />Speichern</button></div>
        </form>
        {noteError && <div className="industrial-message industrial-message-warning">{noteError}</div>}
        {noteInfo && <div className="industrial-message industrial-message-ok">{noteInfo}</div>}
      </section>


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
    </ModuleFrame>
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

function StepTooltip({ text }: { text: string }) {
  return (
    <span className="industrial-help-dot" title={text} aria-label={text}>
      <HelpCircle className="h-3.5 w-3.5" />
    </span>
  );
}

function PreventionView({ cases, contacts, onWorkDataChanged }: { cases: CaseRecord[]; contacts: ContactRecord[]; onWorkDataChanged: () => Promise<void> }) {
  const [processes, setProcesses] = useState<PreventionProcessRecord[]>([]);
  const [steps, setSteps] = useState<PreventionStepDefinition[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [warnings, setWarnings] = useState<PreventionWarning[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [newCaseId, setNewCaseId] = useState('');
  const [firstKnowledgeAt, setFirstKnowledgeAt] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [requestedAt, setRequestedAt] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [employerResponseDueAt, setEmployerResponseDueAt] = useState('');
  const [difficultyType, setDifficultyType] = useState<PreventionDifficultyType>('gesundheitlich_arbeitsplatzbezogen');
  const [riskType, setRiskType] = useState<PreventionRiskType>('ueberlastung');
  const [personStatus, setPersonStatus] = useState<PreventionProcessRecord['personStatus']>('unklar');
  const [hazardDescription, setHazardDescription] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  const selected = useMemo(() => processes.find((process) => process.id === selectedId), [processes, selectedId]);
  const selectedCase = useMemo(() => cases.find((item) => item.id === selected?.caseId), [cases, selected]);

  async function reload() {
    const bridge = await waitForBridge();
    if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
    const [rows, stepRows] = await Promise.all([bridge.prevention.list(), bridge.prevention.steps()]);
    setProcesses(rows);
    setSteps(stepRows);
    if (!selectedId && rows.length) setSelectedId(rows[0].id);
    if (!newCaseId && cases.length) setNewCaseId(cases[0].id);
  }

  useEffect(() => {
    void reload().catch((error) => setError(error instanceof Error ? error.message : 'Präventionsverfahren konnten nicht geladen werden.'));
  }, [cases.length]);

  useEffect(() => {
    if (!selectedId) {
      setWarnings([]);
      return;
    }
    async function loadWarnings() {
      const bridge = await waitForBridge();
      if (!bridge?.prevention) return;
      setWarnings(await bridge.prevention.warnings(selectedId));
    }
    void loadWarnings();
  }, [selectedId, processes]);

  function toggleContact(contactId: string, checked: boolean) {
    setSelectedContactIds((current) => checked ? [...new Set([...current, contactId])] : current.filter((id) => id !== contactId));
  }

  async function createProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInfo('');
    if (!newCaseId) {
      setError('Bitte zuerst einen Fall auswählen.');
      return;
    }
    if (!hazardDescription.trim()) {
      setError('Bitte die Gefährdung kurz beschreiben.');
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
      const input: CreatePreventionProcessInput = {
        caseId: newCaseId,
        firstKnowledgeAt: firstKnowledgeAt ? fromDateTimeLocalValue(firstKnowledgeAt) : undefined,
        requestedAt: requestedAt ? fromDateTimeLocalValue(requestedAt) : undefined,
        employerResponseDueAt: employerResponseDueAt ? fromDateTimeLocalValue(employerResponseDueAt) : undefined,
        difficultyType,
        riskType,
        personStatus,
        hazardDescription,
        contactIds: selectedContactIds,
        createDefaultDeadlines: true
      };
      const created = await bridge.prevention.create(input);
      setSelectedId(created.id);
      setHazardDescription('');
      setSelectedContactIds([]);
      setInfo('Präventionsverfahren angelegt. Die Wiedervorlage für die Arbeitgeberreaktion wurde automatisch erzeugt.');
      await reload();
      await onWorkDataChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Präventionsverfahren konnte nicht angelegt werden.');
    }
  }

  async function updateSelected(input: UpdatePreventionProcessInput) {
    if (!selected) return;
    setError('');
    setInfo('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
      const updated = await bridge.prevention.update(selected.id, input);
      setSelectedId(updated.id);
      setInfo('Präventionsverfahren aktualisiert.');
      await reload();
      await onWorkDataChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Präventionsverfahren konnte nicht aktualisiert werden.');
    }
  }

  return (
    <ModuleFrame title="Präventionsverfahren" kicker="§ 167 Abs. 1 SGB IX" description="Frühzeitige, fallbezogene Steuerung bei erkennbarer Gefährdung des Arbeitsverhältnisses schwerbehinderter oder gleichgestellter Menschen.">
      <section className="industrial-panel">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Neues Verfahren</p>
            <h2>Präventionsverfahren starten</h2>
            <p>Das Verfahren hängt immer an einer Fallakte. Beim Anlegen wird automatisch eine Wiedervorlage für die Arbeitgeberreaktion erzeugt.</p>
          </div>
        </div>
        <form className="industrial-form" onSubmit={createProcess}>
          <div className="industrial-form-grid">
            <label><span>Fallakte</span><select value={newCaseId} onChange={(event) => setNewCaseId(event.target.value)}>{cases.map((record) => <option key={record.id} value={record.id}>{record.caseNumber} · {record.displayName}</option>)}</select></label>
            <label><span>erste Kenntnis</span><input type="datetime-local" value={firstKnowledgeAt} onChange={(event) => setFirstKnowledgeAt(event.target.value)} /></label>
            <label><span>Arbeitgeber angefordert am</span><input type="datetime-local" value={requestedAt} onChange={(event) => setRequestedAt(event.target.value)} /></label>
            <label><span>Frist Arbeitgeberreaktion</span><input type="datetime-local" value={employerResponseDueAt} onChange={(event) => setEmployerResponseDueAt(event.target.value)} placeholder="leer = 7 Tage nach Anforderung" /></label>
            <label><span>Schwierigkeit</span><select value={difficultyType} onChange={(event) => setDifficultyType(event.target.value as PreventionDifficultyType)}>{preventionDifficultyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span>Risiko</span><select value={riskType} onChange={(event) => setRiskType(event.target.value as PreventionRiskType)}>{preventionRiskOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span>Status Person</span><select value={personStatus} onChange={(event) => setPersonStatus(event.target.value as PreventionProcessRecord['personStatus'])}><option value="unklar">unklar</option><option value="schwerbehindert">schwerbehindert</option><option value="gleichgestellt">gleichgestellt</option><option value="antrag_laeuft">Antrag läuft</option></select></label>
          </div>
          <label><span>Gefährdung / Anlass</span><textarea value={hazardDescription} onChange={(event) => setHazardDescription(event.target.value)} placeholder="Kurz und sachlich: Welche Schwierigkeiten gefährden Beschäftigung, Gesundheit oder Arbeitsplatz?" /></label>
          <div className="case-note-link-panel">
            <span>Beteiligte Kontakte</span>
            <div className="case-note-link-grid">
              {contacts.slice(0, 18).map((contact) => (
                <label key={contact.id} className="industrial-checkbox-row compact">
                  <input type="checkbox" checked={selectedContactIds.includes(contact.id)} onChange={(event) => toggleContact(contact.id, event.target.checked)} />
                  <span>{formatContactReference(contact)}</span>
                </label>
              ))}
              {!contacts.length && <p className="industrial-meta">Noch keine Kontakte vorhanden.</p>}
            </div>
          </div>
          <div className="industrial-card-actions"><button className="industrial-button" type="submit"><Plus className="h-4 w-4" />Präventionsverfahren anlegen</button></div>
        </form>
        {error && <div className="industrial-message industrial-message-warning mt-4">{error}</div>}
        {info && <div className="industrial-message industrial-message-ok mt-4">{info}</div>}
      </section>

      <section className="industrial-split-grid">
        <aside className="industrial-panel">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Register</p><h2>Laufende Verfahren</h2></div></div>
          <div className="case-register-list compact">
            {processes.map((process) => {
              const record = cases.find((item) => item.id === process.caseId);
              return (
                <button key={process.id} type="button" className={`case-register-row ${selectedId === process.id ? 'active' : ''}`} onClick={() => setSelectedId(process.id)}>
                  <strong>{record?.caseNumber ?? 'Fall nicht auflösbar'}</strong>
                  <span>{statusLabel(process.status)} · {process.riskType.replaceAll('_', ' ')}</span>
                  <small>Arbeitgeberfrist: {formatDateShort(process.employerResponseDueAt)}</small>
                </button>
              );
            })}
            {!processes.length && <div className="industrial-empty compact">Noch kein Präventionsverfahren angelegt.</div>}
          </div>
        </aside>

        <section className="industrial-panel prevention-detail-panel">
          {!selected && <div className="industrial-empty">Verfahren auswählen oder neu anlegen.</div>}
          {selected && (
            <>
              <div className="industrial-panel-header compact">
                <div>
                  <p className="industrial-kicker">{selectedCase?.caseNumber ?? 'Fall'}</p>
                  <h2>{selectedCase?.displayName ?? 'Präventionsverfahren'}</h2>
                  <p>{statusLabel(selected.status)} · erste Kenntnis: {formatDateShort(selected.firstKnowledgeAt)}</p>
                </div>
                <select value={selected.status} onChange={(event) => void updateSelected({ status: event.target.value as PreventionStatus })}>
                  <option value="zu_pruefen">zu prüfen</option>
                  <option value="angefordert">angefordert</option>
                  <option value="arbeitgeber_reagiert">Arbeitgeber reagiert</option>
                  <option value="inklusionsamt_eingeschaltet">Inklusionsamt eingeschaltet</option>
                  <option value="massnahmen_in_klaerung">Maßnahmen in Klärung</option>
                  <option value="massnahmen_vereinbart">Maßnahmen vereinbart</option>
                  <option value="abgeschlossen">abgeschlossen</option>
                  <option value="blockiert_verweigert">blockiert / verweigert</option>
                </select>
              </div>

              {!!warnings.length && (
                <div className="prevention-warning-stack">
                  {warnings.map((warning) => <div key={warning.message} className={`industrial-message ${warning.level === 'critical' ? 'industrial-message-warning' : 'industrial-message-info'}`}>{warning.message}</div>)}
                </div>
              )}

              <div className="prevention-step-grid">
                {steps.map((step) => (
                  <article key={step.key} className="prevention-step-card">
                    <header><span>{step.title}</span><StepTooltip text={step.objective} /></header>
                    <p>{step.objective}</p>
                  </article>
                ))}
              </div>

              <div className="industrial-form mt-5">
                <div className="industrial-form-grid">
                  <label><span>Arbeitgeber reagiert am</span><input type="datetime-local" value={toDateTimeLocalValue(selected.employerRespondedAt)} onChange={(event) => void updateSelected({ employerRespondedAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : undefined, status: 'arbeitgeber_reagiert' })} /></label>
                  <label><span>Inklusionsamt eingeschaltet am</span><input type="datetime-local" value={toDateTimeLocalValue(selected.integrationOfficeInvolvedAt)} onChange={(event) => void updateSelected({ integrationOfficeInvolvedAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : undefined, status: 'inklusionsamt_eingeschaltet' })} /></label>
                  <label><span>nächste Wiedervorlage</span><input type="datetime-local" value={toDateTimeLocalValue(selected.nextReviewAt)} onChange={(event) => void updateSelected({ nextReviewAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : undefined })} /></label>
                </div>
                <label><span>Arbeitgeberanforderung / Gesprächsstand</span><textarea defaultValue={selected.employerRequestSummary ?? ''} onBlur={(event) => void updateSelected({ employerRequestSummary: event.target.value })} /></label>
                <label><span>Maßnahmen</span><textarea defaultValue={selected.measures ?? ''} onBlur={(event) => void updateSelected({ measures: event.target.value, status: event.target.value.trim() ? 'massnahmen_vereinbart' : selected.status })} /></label>
                <label><span>Ergebnis / Abschlussbewertung</span><textarea defaultValue={selected.result ?? ''} onBlur={(event) => void updateSelected({ result: event.target.value })} /></label>
              </div>
            </>
          )}
        </section>
      </section>
    </ModuleFrame>
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
                    const ok = window.confirm(`Kontakt wirklich löschen und alle bekannten Textstellen anonymisieren?\n\n${formatContactReference(contact)}`);
                    if (!ok) return;
                    try {
                      const result = await onDeleteContact(contact);
                      setMessage(result.anonymizedReferences
                        ? `Kontakt gelöscht. ${result.anonymizedReferences} Textbezug/Textbezüge in ${result.touchedNotes} Protokoll(en) wurden anonymisiert.`
                        : 'Kontakt gelöscht. Es wurden keine gespeicherten Textbezüge gefunden.');
                    } catch (error) {
                      setError(error instanceof Error ? error.message : 'Kontakt konnte nicht gelöscht werden.');
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
        <div className="industrial-table-shell">
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

function KnowledgeView({ cases }: { cases: CaseRecord[] }) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [norms, setNorms] = useState<LegalNormRecord[]>([]);
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
  const sources = useMemo(() => [...new Set(norms.map((norm) => norm.source))].sort((a, b) => a.localeCompare(b)), [norms]);

  async function loadNorms(nextQuery = query, nextSource = source) {
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      const rows = await bridge.knowledge.listNorms({ query: nextQuery || undefined, source: nextSource || undefined, limit: 300 });
      setNorms(rows);
      if (!selectedNormId && rows.length) setSelectedNormId(rows[0].id);
      if (selectedNormId && !rows.some((norm) => norm.id === selectedNormId)) setSelectedNormId(rows[0]?.id ?? '');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Wissensdatenbank konnte nicht geladen werden.');
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
    <ModuleFrame title="Wissensdatenbank" kicker="SBV-Kompass" description="Rechtsnormen, Praxishinweise, eigene Kommentare, Rechtsprechung und Fallverknüpfungen. In Protokollen mit §§ einfügen.">
      <section className="industrial-panel">
        <form onSubmit={runSearch} className="case-search-bar">
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

      <section className="industrial-split-grid">
        <aside className="industrial-panel">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Normen</p><h2>Register</h2></div></div>
          <div className="case-register-list compact">
            {norms.map((norm) => (
              <button key={norm.id} type="button" className={`case-register-row ${selectedNormId === norm.id ? 'active' : ''}`} onClick={() => setSelectedNormId(norm.id)}>
                <strong>{norm.paragraph}</strong>
                <span>{norm.title}</span>
                <small>{norm.source} · {norm.tags.slice(0, 3).join(', ')}</small>
              </button>
            ))}
            {!norms.length && <div className="industrial-empty compact">Keine Normen gefunden.</div>}
          </div>
        </aside>

        <section className="industrial-panel prevention-detail-panel">
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

              <div className="industrial-subpanel mt-4">
                <h4>Mit Fallakte verknüpfen</h4>
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
              </div>

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

function PlaceholderView({ view }: { view: ModuleDefinition }) {
  return (
    <ModuleFrame title={view.title} kicker={view.shortTitle} description={view.text}>
      <div className="industrial-empty">
        <view.icon className="h-10 w-10 text-yellow-300" />
        <div>
          <h3>Modul geöffnet</h3>
          <p>Hier erscheinen die Fachmasken dieses Bereichs.</p>
        </div>
      </div>
    </ModuleFrame>
  );
}

function ModuleFrame({
  title,
  kicker,
  description,
  children
}: {
  title: string;
  kicker: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <header className="industrial-module-header">
        <div>
          <p className="industrial-kicker">{kicker}</p>
          <h1 className="industrial-title">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function IndustrialTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) {
    return <div className="industrial-empty">{empty}</div>;
  }

  return (
    <div className="industrial-table-shell">
      <table className="industrial-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShellNav({ current, onNavigate }: { current: ViewId; onNavigate: (view: ViewId) => void }) {
  return (
    <nav className="industrial-nav">
      <button className={current === 'dashboard' ? 'active' : ''} onClick={() => onNavigate('dashboard')}>
        <TerminalSquare className="h-4 w-4" />
        Dashboard
      </button>
      {modules.map((module) => (
        <button key={module.id} className={current === module.id ? 'active' : ''} onClick={() => onNavigate(module.id)}>
          <module.icon className="h-4 w-4" />
          {module.shortTitle}
        </button>
      ))}
      <button className={current === 'settings' ? 'active' : ''} onClick={() => onNavigate('settings')}>
        <SettingsIcon className="h-4 w-4" />
        Einstellungen
      </button>
    </nav>
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

  const currentModule = useMemo(() => modules.find((module) => module.id === currentView), [currentView]);

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
        {currentView === 'cases' && <CasesView cases={cases} contacts={contacts} onCreateCase={createCase} onCreateDeadline={createDeadline} onCreateContact={createContact} onCasesChanged={reloadWorkData} />}
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
        {currentView === 'prevention' && <PreventionView cases={cases} contacts={contacts} onWorkDataChanged={reloadWorkData} />}
        {currentView === 'reports' && <ReportsView />}
        {currentView === 'settings' && <SettingsView theme={theme} onThemeChange={setTheme} cases={cases} />}
        {currentView !== 'dashboard' && currentView !== 'cases' && currentView !== 'deadlines' && currentView !== 'contacts' && currentView !== 'knowledge' && currentView !== 'prevention' && currentView !== 'reports' && currentView !== 'settings' && currentModule && (
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
  );
}
