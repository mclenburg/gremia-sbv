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

type ViewId =
  | 'dashboard'
  | 'cases'
  | 'deadlines'
  | 'bem'
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
      return;
    }
    let active = true;
    async function loadCaseChildren() {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
        const [noteRows, docRows] = await Promise.all([
          bridge.cases.listNotes(selectedCaseId),
          bridge.cases.listDocuments(selectedCaseId)
        ]);
        if (active) {
          setNotes(noteRows);
          setDocuments(docRows);
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
    const [noteRows, docRows] = await Promise.all([
      bridge.cases.listNotes(selectedCaseId),
      bridge.cases.listDocuments(selectedCaseId)
    ]);
    setNotes(noteRows);
    setDocuments(docRows);
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
    setNoteError('');
    setNoteInfo('');
  }


  function toggleLinkedCase(caseId: string, checked: boolean) {
    setLinkedCaseIds((current) => {
      const next = checked ? [...current, caseId] : current.filter((id) => id !== caseId);
      return [...new Set(next)];
    });
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
    const deadlineMarkerIndex = value.indexOf('//');
    const contactMarkerIndex = value.indexOf('@@');

    if (target === 'content') {
      const hadDeadlineCommand = content.includes('//');
      const hadContactCommand = content.includes('@@');
      setContent(value);
      if (!inlineDeadlineDraft && !inlineContactDraft && deadlineMarkerIndex >= 0 && !hadDeadlineCommand) {
        setInlineDeadlineDraft({
          target,
          title: defaultDeadlineTitleForCase(selectedCase, noteTitle),
          dueAt: '',
          severity: 'important',
          legalBasis: '',
          description: 'Aus Protokolltext per // angelegt.',
          markerIndex: deadlineMarkerIndex
        });
      }
      if (!inlineDeadlineDraft && !inlineContactDraft && contactMarkerIndex >= 0 && !hadContactCommand) {
        openInlineContactDraft(target, contactMarkerIndex);
      }
      return;
    }

    const hadDeadlineCommand = nextSteps.includes('//');
    const hadContactCommand = nextSteps.includes('@@');
    setNextSteps(value);
    if (!inlineDeadlineDraft && !inlineContactDraft && deadlineMarkerIndex >= 0 && !hadDeadlineCommand) {
      setInlineDeadlineDraft({
        target,
        title: defaultDeadlineTitleForCase(selectedCase, noteTitle),
        dueAt: '',
        severity: 'important',
        legalBasis: '',
        description: 'Aus nächste Schritte per // angelegt.',
        markerIndex: deadlineMarkerIndex
      });
    }
    if (!inlineDeadlineDraft && !inlineContactDraft && contactMarkerIndex >= 0 && !hadContactCommand) {
      openInlineContactDraft(target, contactMarkerIndex);
    }
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
              <div className="case-detail-metrics"><Metric label="Notizen" value={String(notes.length)} /><Metric label="Dokumente" value={String(documents.length)} /><Metric label="Kategorie" value={selectedCase?.category ?? '—'} /></div>
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
              <div className="industrial-card-actions"><button type="button" className="industrial-secondary-button" onClick={() => void deleteDocument(selectedDocument)}><Trash2 className="h-4 w-4" /> Löschen</button></div>
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
          <label className="case-note-content-input"><span>Inhalt</span><textarea value={content} onChange={(event) => handleProtocolTextChange('content', event.target.value)} placeholder="Gesprächsinhalt / Protokoll … // für Frist, @@ für Kontakt" /></label>
          <label className="case-note-content-input"><span>Nächste Schritte</span><textarea value={nextSteps} onChange={(event) => handleProtocolTextChange('nextSteps', event.target.value)} placeholder="optional · // öffnet Frist-Overlay, @@ öffnet Kontakt-Overlay" /></label>
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
              <FolderOpen className="h-4 w-4" /> Im Ordner anzeigen
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
                  <td><button className="industrial-icon-button" onClick={() => void window.gremiaSbv?.reports?.openExportFolder(item.filePath)} title="Im Ordner anzeigen"><FolderOpen className="h-3.5 w-3.5" /></button></td>
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

function SettingsView({ theme, onThemeChange }: { theme: ThemeMode; onThemeChange: (theme: ThemeMode) => void }) {
  return (
    <ModuleFrame title="Einstellungen" kicker="System" description="Passwortverwaltung, Darstellung und lokale Anwendungseinstellungen.">
      <div className="grid gap-6 xl:grid-cols-2">
        <ThemeSettingsForm theme={theme} onThemeChange={onThemeChange} />
        <ChangePasswordForm />
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
        {currentView === 'reports' && <ReportsView />}
        {currentView === 'settings' && <SettingsView theme={theme} onThemeChange={setTheme} />}
        {currentView !== 'dashboard' && currentView !== 'cases' && currentView !== 'deadlines' && currentView !== 'contacts' && currentView !== 'reports' && currentView !== 'settings' && currentModule && (
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
