import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LogOut } from "lucide-react";
import { PlaceholderView } from "./shared/components/PlaceholderView";
import { ShellNav } from "./shell/ShellNav";
import { LazyFeatureHost } from "./core/loading/LazyFeatureHost";
import { preloadLazyFeature } from "./core/loading/lazyFeatureViews";
import { modules, type ViewId } from "./core/navigation/modules";
import { useModalKeyboardShortcuts } from "./core/keyboard/useModalKeyboardShortcuts";
import { AUTO_LOCK_TIMEOUT_MS, useAutoLock } from "./core/security/useAutoLock";
import { INITIAL_SESSION_VIEW, toLockedSessionState } from "./core/security/sessionLockState";
import type { CaseCategory, CaseRecord, WorkplaceAccommodationRecord, CaseMeasureRecord, ProtectedPersonRecord, ContactRecord, CreateContactInput, DeleteContactResult, CreateDeadlineInput, DeadlineDashboardItem, DeadlineRecord, DeadlineSeverity, SbvParticipationViolationPrefill, ActivityJournalPrefill, AuthMode, CaseNodeTarget } from "./appTypes";
import "./appStyles";
import { APP_VERSION } from "./generated/appVersion";
import { ConfirmDialogProvider } from "./shared/dialogs/ConfirmDialogProvider";
import { LiveRegionProvider } from "./shared/a11y/LiveRegionProvider";
import { GlobalTextCommandController } from "./shared/textCommands/GlobalTextCommandController";
import { TextCommandHelpModal } from "./shared/textCommands/TextCommandHelpModal";
import { WorkplaceAccommodationView } from "./features/workplace-accommodation/WorkplaceAccommodationView";
import { ContactsView } from "./features/contacts/ContactsView";
import { ActivityJournalView } from "./features/activity-journal/ActivityJournalView";
import { SbvParticipationViolationsView } from "./features/participation-violations/SbvParticipationViolationsView";
import { ACTIVITY_JOURNAL_PREFILL_EVENT, type ActivityJournalPrefillEventDetail } from "./features/activity-journal/activityJournalEvents";
import { PersonsView } from "./features/persons/PersonsView";
import { usePersonsHandlers } from "./features/persons/usePersonsHandlers";
import { useIcalExportHandlers } from "./features/deadlines/useIcalExportHandlers";
import { DashboardFocusOverview } from "./features/dashboard/DashboardFocusOverview";
import { applyTheme, getInitialTheme, nowLabel, type ThemeMode } from "./workflowViews";
import { DeadlinesView, DeadlineEditor } from "./features/deadlines/DeadlinesView";
import { LoginGate } from "./features/auth/LoginGate";
import { waitForBridge } from "./core/bridge/waitForBridge";
const IMPLEMENTED_VIEW_IDS = new Set<ViewId>([
  "dashboard",
  "cases",
  "deadlines",
  "activity_journal",
  "participation_violations",
  "persons",
  "contacts",
  "knowledge",
  "bem",
  "prevention",
  "participation",
  "recruiting_participations",
  "workplace_accommodation",
  "equalization",
  "termination_hearing",
  "templates",
  "sbv_control",
  "reports",
  "compliance",
  "settings",
]);

function isImplementedView(viewId: ViewId): boolean {
  return IMPLEMENTED_VIEW_IDS.has(viewId);
}


function WorkplaceAccommodationContainer({
  onOpenCaseNode,
}: {
  onOpenCaseNode: (target: CaseNodeTarget) => void;
}) {
  const [items, setItems] = useState<WorkplaceAccommodationRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.workplaceAccommodation) throw new Error("Arbeitsplatzgestaltungsdienst ist nicht erreichbar.");
        const rows = await bridge.workplaceAccommodation.list();
        if (active) setItems(rows);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Arbeitsplatzgestaltung konnte nicht geladen werden.");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <>
      {error && <div className="industrial-message industrial-message-warning mb-4" role="alert">{error}</div>}
      <WorkplaceAccommodationView
        items={items}
        onOpenCase={(caseId, processId) => onOpenCaseNode({ caseId, nodeType: "workplace_accommodation", nodeId: processId })}
      />
    </>
  );
}

function useSecuritySession() {
  const [authMode, setAuthMode] = useState<AuthMode>("loading");
  const [unlocked, setUnlocked] = useState(false);
  const switchToLockedSession = useCallback(() => {
    const locked = toLockedSessionState({ unlocked: true, authMode: "login" as AuthMode });
    setUnlocked(locked.unlocked); setAuthMode(locked.authMode);
  }, []);
  useAutoLock({ enabled: unlocked, timeoutMs: AUTO_LOCK_TIMEOUT_MS, onLock: switchToLockedSession });
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const bridge = await waitForBridge();
        if (!active) return;
        if (!bridge?.security) { setUnlocked(false); setAuthMode("unavailable"); return; }
        const status = await bridge.security.status();
        if (!active) return;
        setUnlocked(status.unlocked);
        setAuthMode(status.recoveryRequired ? "recovery" : status.initialized ? "login" : "setup");
      } catch (error) {
        console.error("Gremia.SBV security status failed", error);
        if (active) { setUnlocked(false); setAuthMode("unavailable"); }
      }
    })();
    return () => { active = false; };
  }, []);
  return { authMode, setAuthMode, unlocked, setUnlocked, switchToLockedSession };
}

function useActivityJournalNavigation(setCurrentView: (view: ViewId) => void) {
  const [activityJournalPrefill, setActivityJournalPrefill] = useState<ActivityJournalPrefill | null>(null);
  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<ActivityJournalPrefillEventDetail>).detail;
      if (!detail?.prefill) return;
      setActivityJournalPrefill(detail.prefill);
      if (detail.navigate !== false) setCurrentView("activity_journal");
    };
    window.addEventListener(ACTIVITY_JOURNAL_PREFILL_EVENT, handle);
    return () => window.removeEventListener(ACTIVITY_JOURNAL_PREFILL_EVENT, handle);
  }, [setCurrentView]);
  return { activityJournalPrefill, setActivityJournalPrefill };
}

function useWorkData(unlocked: boolean, setCurrentView: (view: ViewId) => void, setActivityJournalPrefill: (prefill: ActivityJournalPrefill | null) => void) {
  const [cases, setCases] = useState<CaseRecord[]>([]); const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineRecord[]>([]); const [persons, setPersons] = useState<ProtectedPersonRecord[]>([]);
  const [caseMeasures, setCaseMeasures] = useState<CaseMeasureRecord[]>([]);
  const [dashboardDeadlines, setDashboardDeadlines] = useState<DeadlineDashboardItem[]>([]);
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineRecord | null>(null); const [dataError, setDataError] = useState("");
  const reloadWorkData = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.cases || !bridge.contacts || !bridge.deadlines) throw new Error("Datenbrücke ist nicht geladen.");
    const [caseRows, contactRows, deadlineRows, dashboardRows, measureRows, personRows] = await Promise.all([
      bridge.cases.list(), bridge.contacts.list(), bridge.deadlines.list({ status: ["open", "overdue"] }), bridge.deadlines.dashboard(),
      bridge.caseMeasures?.list() ?? Promise.resolve([]), bridge.persons?.list() ?? Promise.resolve([]),
    ]);
    setCases(caseRows); setContacts(contactRows); setDeadlines(deadlineRows); setDashboardDeadlines(dashboardRows);
    setCaseMeasures(measureRows); setPersons(personRows);
  }, []);
  const createCase = async (input: { caseNumber: string; displayName: string; category: CaseCategory; summary?: string;
    protectedPersonId?: string; personBindingState?: CaseRecord["personBindingState"]; isPseudonymized?: boolean }) => {
    const bridge = await waitForBridge(); if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
    await bridge.cases.create(input); await reloadWorkData();
  };
  const createContact = async (input: CreateContactInput): Promise<ContactRecord> => {
    const bridge = await waitForBridge(); if (!bridge?.contacts) throw new Error("Kontaktdienst ist nicht erreichbar.");
    const created = await bridge.contacts.create(input); setContacts(await bridge.contacts.list()); return created;
  };
  const deleteContact = async (contact: ContactRecord): Promise<DeleteContactResult> => {
    const bridge = await waitForBridge(); if (!bridge?.contacts) throw new Error("Kontaktdienst ist nicht erreichbar.");
    const result = await bridge.contacts.delete(contact.id); await reloadWorkData(); return result;
  };
  const createDeadline = async (input: CreateDeadlineInput) => {
    const bridge = await waitForBridge(); if (!bridge?.deadlines) throw new Error("Fristendienst ist nicht erreichbar.");
    await bridge.deadlines.create(input); await reloadWorkData();
  };
  const updateDeadline = async (id: string, input: { title: string; dueAt: string; severity: DeadlineSeverity; description?: string; legalBasis?: string; reason: string }) => {
    const bridge = await waitForBridge(); if (!bridge?.deadlines) throw new Error("Fristendienst ist nicht erreichbar.");
    await bridge.deadlines.update(id, input); await reloadWorkData();
  };
  const completeDeadline = async (deadline: DeadlineRecord) => {
    const bridge = await waitForBridge(); if (!bridge?.deadlines) throw new Error("Fristendienst ist nicht erreichbar.");
    const completed = await bridge.deadlines.complete(deadline.id, "Über Dashboard/Fristenregister als erledigt markiert.");
    if (deadline.processType === "activity_journal" && bridge.activityJournal?.buildPrefillFromClosedDeadline) {
      setActivityJournalPrefill(await bridge.activityJournal.buildPrefillFromClosedDeadline(completed)); setCurrentView("activity_journal");
    }
    setSelectedDeadline(null); await reloadWorkData();
  };
  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    reloadWorkData().catch((error) => { console.error("Gremia.SBV work data load failed", error); if (active) setDataError(error instanceof Error ? error.message : "Arbeitsdaten konnten nicht geladen werden."); });
    return () => { active = false; };
  }, [unlocked, reloadWorkData]);
  return { cases, contacts, deadlines, persons, caseMeasures, dashboardDeadlines, selectedDeadline, setSelectedDeadline, dataError,
    reloadWorkData, createCase, createContact, deleteContact, createDeadline, updateDeadline, completeDeadline };
}

type WorkData = ReturnType<typeof useWorkData>;
type PrimaryViewsProps = { currentView: ViewId; setCurrentView: (view: ViewId) => void; work: WorkData; caseNodeTarget: CaseNodeTarget | null;
  setCaseNodeTarget: (target: CaseNodeTarget | null) => void; activityJournalPrefill: ActivityJournalPrefill | null;
  setActivityJournalPrefill: (prefill: ActivityJournalPrefill | null) => void; participationViolationPrefill: SbvParticipationViolationPrefill | null;
  setParticipationViolationPrefill: (prefill: SbvParticipationViolationPrefill | null) => void; };

function PrimaryViews(props: PrimaryViewsProps) {
  const { currentView, setCurrentView, work, caseNodeTarget, setCaseNodeTarget, activityJournalPrefill, setActivityJournalPrefill,
    participationViolationPrefill, setParticipationViolationPrefill } = props;
  const { cases, contacts, deadlines, persons, caseMeasures, dashboardDeadlines, setSelectedDeadline, createCase, createContact,
    deleteContact, createDeadline, completeDeadline, reloadWorkData } = work;
  const personHandlers = usePersonsHandlers(reloadWorkData); const icalHandlers = useIcalExportHandlers();
  if (currentView === "dashboard") return <DashboardFocusOverview onNavigate={setCurrentView} cases={cases} deadlines={deadlines}
    dashboardItems={dashboardDeadlines} onEditDeadline={setSelectedDeadline} onCompleteDeadline={(d) => void completeDeadline(d)} />;
  if (currentView === "activity_journal") return <ActivityJournalView pendingPrefill={activityJournalPrefill} onPrefillConsumed={() => setActivityJournalPrefill(null)} />;
  if (currentView === "participation_violations") return <SbvParticipationViolationsView cases={cases} pendingPrefill={participationViolationPrefill}
    onPrefillConsumed={() => setParticipationViolationPrefill(null)} onOpenJournalPrefill={(prefill) => { setActivityJournalPrefill(prefill); setCurrentView("activity_journal"); }} />;
  if (currentView === "deadlines") return <DeadlinesView cases={cases} measures={caseMeasures} deadlines={deadlines}
    onCreateDeadline={createDeadline} onEditDeadline={setSelectedDeadline} onCompleteDeadline={(d) => void completeDeadline(d)}
    onExportIcal={(privacyLevel, filters) => icalHandlers.exportIcal({ privacyLevel, filters })} />;
  if (currentView === "persons") return <PersonsView persons={persons} cases={cases}
    onCreateCaseForPerson={async (person, input) => createCase({ ...input, protectedPersonId: person.id, personBindingState: person.recordKind === "pseudonymous_request" ? "anonymous_request" : "active", isPseudonymized: true })}
    onCreate={personHandlers.createProtectedPerson} onUpdate={personHandlers.updateProtectedPerson}
    onSelectImportFile={personHandlers.selectProtectedPersonImportFile} onPreviewImport={personHandlers.previewProtectedPersonsImport}
    onExecuteImport={personHandlers.executeProtectedPersonsImport} onEvaluateExpiry={personHandlers.evaluateProtectedPersonExpiry}
    onExportIcal={personHandlers.exportDeadlinesAsIcal} onListOpenPrivacyReviews={personHandlers.listOpenPrivacyReviewsForPerson}
    onDocumentRetention={personHandlers.documentPrivacyRetention} onScheduleReviewLater={personHandlers.schedulePrivacyReviewLater}
    onClearReview={personHandlers.clearPrivacyReview} onAnonymizeReviewCase={personHandlers.anonymizePrivacyReviewCase}
    onDeleteReviewCase={personHandlers.deletePrivacyReviewCase} onAnonymizePerson={personHandlers.anonymizeProtectedPerson}
    onDeletePerson={personHandlers.deleteProtectedPerson} />;
  if (currentView === "contacts") return <ContactsView contacts={contacts} onCreateContact={createContact} onDeleteContact={deleteContact} />;
  return null;
}

function ProcessViews({ currentView, setCurrentView, work, caseNodeTarget, setCaseNodeTarget, openCaseNode, theme, setTheme, setParticipationViolationPrefill }: {
  currentView: ViewId; setCurrentView: (view: ViewId) => void; work: WorkData; caseNodeTarget: CaseNodeTarget | null;
  setCaseNodeTarget: (target: CaseNodeTarget | null) => void; openCaseNode: (target: CaseNodeTarget) => void;
  theme: ThemeMode; setTheme: (theme: ThemeMode) => void; setParticipationViolationPrefill: (prefill: SbvParticipationViolationPrefill | null) => void;
}) {
  const { cases, contacts, deadlines, persons, createCase, createContact, createDeadline, reloadWorkData } = work;
  if (currentView === "workplace_accommodation") return <WorkplaceAccommodationContainer onOpenCaseNode={openCaseNode} />;
  return <LazyFeatureHost view={currentView} cases={cases} theme={theme} onThemeChange={setTheme} onCreateDeadline={createDeadline}
    onOpenCaseNode={openCaseNode} deadlines={deadlines} onNavigate={setCurrentView}
    caseFeatureProps={{
      cases,
      contacts,
      protectedPersons: persons,
      target: caseNodeTarget,
      onCreateCase: createCase,
      onCreateDeadline: createDeadline,
      onCreateContact: createContact,
      onCasesChanged: reloadWorkData,
      onTargetConsumed: () => setCaseNodeTarget(null),
      onOpenParticipationViolationPrefill: (prefill) => { setParticipationViolationPrefill(prefill); setCurrentView("participation_violations"); },
    }}
    onOpenParticipationViolationPrefill={(prefill) => { setParticipationViolationPrefill(prefill); setCurrentView("participation_violations"); }} />;
}

function WorkspaceMain(props: PrimaryViewsProps & { currentModule?: (typeof modules)[number]; openCaseNode: (target: CaseNodeTarget) => void;
  theme: ThemeMode; setTheme: (theme: ThemeMode) => void; }) {
  const { currentView, currentModule, setCurrentView, work } = props;
  return <main id="main-content" className="industrial-content" tabIndex={-1}>
    <header className="industrial-topbar"><div><p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">Arbeitsplatz</p>
      <h2>{currentView === "dashboard" ? "Dashboard" : currentView === "settings" ? "Einstellungen" : currentModule?.title}</h2></div>
      <div className="industrial-state"><CheckCircle2 className="h-4 w-4 text-yellow-300" />entsperrt · {nowLabel()}</div></header>
    {work.dataError && <div className="industrial-message industrial-message-warning mb-4" role="alert">{work.dataError}</div>}
    <PrimaryViews {...props} />
    <ProcessViews currentView={currentView} setCurrentView={setCurrentView} work={work} caseNodeTarget={props.caseNodeTarget}
      setCaseNodeTarget={props.setCaseNodeTarget} openCaseNode={props.openCaseNode} theme={props.theme} setTheme={props.setTheme}
      setParticipationViolationPrefill={props.setParticipationViolationPrefill} />
    {!isImplementedView(currentView) && currentModule && <PlaceholderView view={currentModule} />}
    <GlobalTextCommandController cases={work.cases} contacts={work.contacts} /><TextCommandHelpModal />
    {work.selectedDeadline && <DeadlineEditor deadline={work.selectedDeadline} cases={work.cases} onClose={() => work.setSelectedDeadline(null)}
      onSave={work.updateDeadline} onComplete={work.completeDeadline} />}
  </main>;
}

function AppShell({ currentView, setCurrentView, switchToLockedSession, children }: { currentView: ViewId; setCurrentView: (view: ViewId) => void;
  switchToLockedSession: () => void; children: React.ReactNode }) {
  return <LiveRegionProvider><ConfirmDialogProvider><a className="skip-link" href="#main-content">Zum Hauptinhalt springen</a>
    <div className="industrial-shell min-h-screen text-zinc-100"><aside className="industrial-sidebar" aria-label="Gremia.SBV Navigation und Sitzung">
      <div className="brand-block"><div className="brand-mark">SBV</div><div><strong>Gremia.SBV</strong><span>LOCAL</span></div></div>
      <ShellNav current={currentView} onNavigate={setCurrentView} onPreload={(view) => { void preloadLazyFeature(view).catch(() => undefined); }} />
      <button type="button" className="industrial-lock-button" onClick={async () => { try { await window.gremiaSbv?.security?.lock?.(); } catch { /* no-op */ } switchToLockedSession(); }}>
        <LogOut className="h-4 w-4" />Sperren</button>
      <div className="industrial-version-badge" aria-label={`Gremia.SBV Version ${APP_VERSION}`}><span>Version</span><strong>{APP_VERSION}</strong></div>
    </aside>{children}</div></ConfirmDialogProvider></LiveRegionProvider>;
}

export function App() {
  const security = useSecuritySession();
  const [currentView, setCurrentView] = useState<ViewId>(INITIAL_SESSION_VIEW);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [caseNodeTarget, setCaseNodeTarget] = useState<CaseNodeTarget | null>(null);
  const [participationViolationPrefill, setParticipationViolationPrefill] = useState<SbvParticipationViolationPrefill | null>(null);
  const journal = useActivityJournalNavigation(setCurrentView);
  const work = useWorkData(security.unlocked, setCurrentView, journal.setActivityJournalPrefill);
  const currentModule = useMemo(() => modules.find((module) => module.id === currentView), [currentView]);
  const openCaseNode = (target: CaseNodeTarget) => { setCaseNodeTarget(target); setCurrentView("cases"); };
  useModalKeyboardShortcuts({ setCurrentView });
  useEffect(() => { applyTheme(theme); }, [theme]);
  if (!security.unlocked) return <LoginGate mode={security.authMode} onUnlock={() => security.setUnlocked(true)}
    onResetToSetup={() => { security.setUnlocked(false); security.setAuthMode("setup"); }} />;
  const viewProps: PrimaryViewsProps = { currentView, setCurrentView, work, caseNodeTarget, setCaseNodeTarget,
    activityJournalPrefill: journal.activityJournalPrefill, setActivityJournalPrefill: journal.setActivityJournalPrefill,
    participationViolationPrefill, setParticipationViolationPrefill };
  return <AppShell currentView={currentView} setCurrentView={setCurrentView} switchToLockedSession={security.switchToLockedSession}>
    <WorkspaceMain {...viewProps} currentModule={currentModule} openCaseNode={openCaseNode} theme={theme} setTheme={setTheme} />
  </AppShell>;
}
