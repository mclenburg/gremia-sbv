import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LogOut } from 'lucide-react';
import { PlaceholderView } from './shared/components/PlaceholderView';
import { ShellNav } from './shell/ShellNav';
import { modules, type ViewId } from './core/navigation/modules';
import { useModalKeyboardShortcuts } from './core/keyboard/useModalKeyboardShortcuts';
import type { CaseCategory, CaseRecord } from './core/models/case.model';
import type { ContactRecord, CreateContactInput, DeleteContactResult } from './core/models/contact.model';
import type { CreateDeadlineInput, DeadlineDashboardItem, DeadlineRecord, DeadlineSeverity } from './core/models/deadline.model';
import { APP_VERSION } from './generated/appVersion';
import { ConfirmDialogProvider } from './shared/dialogs/ConfirmDialogProvider';
import { LiveRegionProvider } from './shared/a11y/LiveRegionProvider';
import { GlobalTextCommandController } from './shared/textCommands/GlobalTextCommandController';
import { KnowledgeView } from './features/knowledge/KnowledgeView';
import { PreventionView } from './features/prevention/PreventionView';
import { BemView } from './features/bem/BemView';
import { ContactsView } from './features/contacts/ContactsView';
import { ReportsView } from './features/reports/ReportsView';
import { TemplatesView } from './features/templates/TemplatesView';
import {
  applyTheme,
  DashboardOverview,
  DeadlineEditor,
  DeadlinesView,
  CasesView,
  getInitialTheme,
  LoginGate,
  nowLabel,
  SettingsView,
  type AuthMode,
  type ThemeMode
} from './workflowViews';
import { waitForBridge } from './core/bridge/waitForBridge';
import type { CaseNodeTarget } from './core/navigation/caseNodeTarget';
import './caseModalResponsive.css';
import './caseWorkbench.css';
import './accessibility.css';
import './templateWorkbench.css';
import './templateDefaults.css';
import './processOverview.css';
import './knowledgeWorkbench.css';
import './confirmDialog.css';
import './accessibilityLiveRegion.css';

const THEME_STORAGE_KEY = 'gremia.sbv.theme';

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
        {currentView === 'bem' && <BemView cases={cases} onOpenCaseNode={openCaseNode} />}
        {currentView === 'prevention' && <PreventionView cases={cases} onOpenCaseNode={openCaseNode} />}
        {currentView === 'templates' && <TemplatesView />}
        {currentView === 'reports' && <ReportsView />}
        {currentView === 'settings' && <SettingsView theme={theme} onThemeChange={setTheme} cases={cases} />}
        {currentView !== 'dashboard' && currentView !== 'cases' && currentView !== 'deadlines' && currentView !== 'contacts' && currentView !== 'knowledge' && currentView !== 'bem' && currentView !== 'prevention' && currentView !== 'templates' && currentView !== 'reports' && currentView !== 'settings' && currentModule && (
          <PlaceholderView view={currentModule} />
        )}
        <GlobalTextCommandController cases={cases} contacts={contacts} />
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
