import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LogOut } from "lucide-react";
import { PlaceholderView } from "./shared/components/PlaceholderView";
import { ShellNav } from "./shell/ShellNav";
import { modules, type ViewId } from "./core/navigation/modules";
import { useModalKeyboardShortcuts } from "./core/keyboard/useModalKeyboardShortcuts";
import { AUTO_LOCK_TIMEOUT_MS, useAutoLock } from "./core/security/useAutoLock";
import type { CaseCategory, CaseRecord } from "./core/models/case.model";
import type { WorkplaceAccommodationRecord } from "./core/models/workplace-accommodation.model";
import type { CaseMeasureRecord } from "./core/models/case-measure.model";
import type { ProtectedPersonRecord } from "./core/models/protected-person.model";
import type {
  ContactRecord,
  CreateContactInput,
  DeleteContactResult,
} from "./core/models/contact.model";
import type {
  CreateDeadlineInput,
  DeadlineDashboardItem,
  DeadlineRecord,
  DeadlineSeverity,
} from "./core/models/deadline.model";
import { APP_VERSION } from "./generated/appVersion";
import { ConfirmDialogProvider } from "./shared/dialogs/ConfirmDialogProvider";
import { LiveRegionProvider } from "./shared/a11y/LiveRegionProvider";
import { GlobalTextCommandController } from "./shared/textCommands/GlobalTextCommandController";
import { TextCommandHelpModal } from "./shared/textCommands/TextCommandHelpModal";
import { KnowledgeView } from "./features/knowledge/KnowledgeView";
import { PreventionView } from "./features/prevention/PreventionView";
import { ParticipationView } from "./features/participation/ParticipationView";
import { WorkplaceAccommodationView } from "./features/workplace-accommodation/WorkplaceAccommodationView";
import { BemView } from "./features/bem/BemView";
import { EqualizationView } from "./features/equalization/EqualizationView";
import { TerminationView } from "./features/termination/TerminationView";
import { ContactsView } from "./features/contacts/ContactsView";
import { ReportsView } from "./features/reports/ReportsView";
import { SbvControlView } from "./features/sbv-control/SbvControlView";
import { ComplianceView } from "./features/compliance/ComplianceView";
import { PersonsView } from "./features/persons/PersonsView";
import { usePersonsHandlers } from "./features/persons/usePersonsHandlers";
import { useIcalExportHandlers } from "./features/deadlines/useIcalExportHandlers";
import { TemplatesView } from "./features/templates/TemplatesView";
import { SettingsHub } from "./features/settings/SettingsHub";
import { DashboardFocusOverview } from "./features/dashboard/DashboardFocusOverview";
import {
  applyTheme,
  CasesView,
  getInitialTheme,
  nowLabel,
  type ThemeMode,
} from "./workflowViews";
import {
  DeadlinesView,
  DeadlineEditor,
} from "./features/deadlines/DeadlinesView";
import { LoginGate } from "./features/auth/LoginGate";
import type { AuthMode } from "./core/auth/authTypes";
import { waitForBridge } from "./core/bridge/waitForBridge";
import type { CaseNodeTarget } from "./core/navigation/caseNodeTarget";
import "./caseWorkbench.css";
import "./accessibility.css";
import "./templateWorkbench.css";
import "./templateDefaults.css";
import "./processOverview.css";
import "./knowledgeWorkbench.css";
import "./confirmDialog.css";
import "./accessibilityLiveRegion.css";
import "./complianceCenter.css";
import "./reportsWorkbench.css";
import "./features/participation/participationWorkbench.css";
import "./features/persons/personsWorkbench.css";
import "./features/sbv-control/sbvControlWorkbench.css";
import "./ui/responsiveDesign.css";
import "./caseModalResponsive.css";
import "./shared/textCommands/textCommandHelp.css";
import "./settingsHub.css";


const IMPLEMENTED_VIEW_IDS = new Set<ViewId>([
  "dashboard",
  "cases",
  "deadlines",
  "persons",
  "contacts",
  "knowledge",
  "bem",
  "prevention",
  "participation",
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
      {error && <div className="industrial-message industrial-message-warning mb-4">{error}</div>}
      <WorkplaceAccommodationView
        items={items}
        onOpenCase={(caseId, processId) => onOpenCaseNode({ caseId, nodeType: "workplace_accommodation", nodeId: processId })}
      />
    </>
  );
}

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("loading");
  const [unlocked, setUnlocked] = useState(false);
  const [currentView, setCurrentView] = useState<ViewId>("dashboard");
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineRecord[]>([]);
  const [persons, setPersons] = useState<ProtectedPersonRecord[]>([]);
  const [caseMeasures, setCaseMeasures] = useState<CaseMeasureRecord[]>([]);
  const [dashboardDeadlines, setDashboardDeadlines] = useState<
    DeadlineDashboardItem[]
  >([]);
  const [selectedDeadline, setSelectedDeadline] =
    useState<DeadlineRecord | null>(null);
  const [dataError, setDataError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [caseNodeTarget, setCaseNodeTarget] = useState<CaseNodeTarget | null>(
    null,
  );

  const currentModule = useMemo(
    () => modules.find((module) => module.id === currentView),
    [currentView],
  );

  function openCaseNode(target: CaseNodeTarget) {
    setCaseNodeTarget(target);
    setCurrentView("cases");
  }

  useModalKeyboardShortcuts({ setCurrentView });

  const switchToLockedSession = useCallback(() => {
    setUnlocked(false);
    setAuthMode("login");
    setCurrentView("dashboard");
    setCaseNodeTarget(null);
    setSelectedDeadline(null);
  }, []);

  useAutoLock({
    enabled: unlocked,
    timeoutMs: AUTO_LOCK_TIMEOUT_MS,
    onLock: switchToLockedSession,
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadSecurityStatus() {
      try {
        const bridge = await waitForBridge();
        if (!active) return;

        if (!bridge?.security) {
          setUnlocked(false);
          setAuthMode("unavailable");
          return;
        }

        const status = await bridge.security.status();
        if (!active) return;
        setUnlocked(status.unlocked);
        if (status.recoveryRequired) {
          setAuthMode("recovery");
        } else {
          setAuthMode(status.initialized ? "login" : "setup");
        }
      } catch (error) {
        console.error("Gremia.SBV security status failed", error);
        if (!active) return;
        setUnlocked(false);
        setAuthMode("unavailable");
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
      throw new Error("Datenbrücke ist nicht geladen.");
    }
    const [caseRows, contactRows, deadlineRows, dashboardRows, measureRows, personRows] =
      await Promise.all([
        bridge.cases.list(),
        bridge.contacts.list(),
        bridge.deadlines.list({ status: ["open", "overdue"] }),
        bridge.deadlines.dashboard(),
        bridge.caseMeasures?.list() ?? Promise.resolve([]),
        bridge.persons?.list() ?? Promise.resolve([]),
      ]);
    setCases(caseRows);
    setContacts(contactRows);
    setDeadlines(deadlineRows);
    setDashboardDeadlines(dashboardRows);
    setCaseMeasures(measureRows);
    setPersons(personRows);
  }

  async function createCase(input: {
    caseNumber: string;
    displayName: string;
    category: CaseCategory;
    summary?: string;
    protectedPersonId?: string;
    personBindingState?: CaseRecord["personBindingState"];
    isPseudonymized?: boolean;
  }) {
    const bridge = await waitForBridge();
    if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
    await bridge.cases.create(input);
    await reloadWorkData();
  }



  const personHandlers = usePersonsHandlers(reloadWorkData);
  const icalHandlers = useIcalExportHandlers();


  async function createContact(
    input: CreateContactInput,
  ): Promise<ContactRecord> {
    const bridge = await waitForBridge();
    if (!bridge?.contacts)
      throw new Error("Kontaktdienst ist nicht erreichbar.");
    const created = await bridge.contacts.create(input);
    const contactRows = await bridge.contacts.list();
    setContacts(contactRows);
    return created;
  }

  async function deleteContact(
    contact: ContactRecord,
  ): Promise<DeleteContactResult> {
    const bridge = await waitForBridge();
    if (!bridge?.contacts)
      throw new Error("Kontaktdienst ist nicht erreichbar.");
    const result = await bridge.contacts.delete(contact.id);
    await reloadWorkData();
    return result;
  }

  async function createDeadline(input: CreateDeadlineInput) {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines)
      throw new Error("Fristendienst ist nicht erreichbar.");
    await bridge.deadlines.create(input);
    await reloadWorkData();
  }

  async function updateDeadline(
    id: string,
    input: {
      title: string;
      dueAt: string;
      severity: DeadlineSeverity;
      description?: string;
      legalBasis?: string;
      reason: string;
    },
  ) {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines)
      throw new Error("Fristendienst ist nicht erreichbar.");
    await bridge.deadlines.update(id, input);
    await reloadWorkData();
  }

  async function completeDeadline(deadline: DeadlineRecord) {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines)
      throw new Error("Fristendienst ist nicht erreichbar.");
    await bridge.deadlines.complete(
      deadline.id,
      "Über Dashboard/Fristenregister als erledigt markiert.",
    );
    setSelectedDeadline(null);
    await reloadWorkData();
  }

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    reloadWorkData().catch((error) => {
      console.error("Gremia.SBV work data load failed", error);
      if (active)
        setDataError(
          error instanceof Error
            ? error.message
            : "Arbeitsdaten konnten nicht geladen werden.",
        );
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
          setAuthMode("setup");
        }}
      />
    );
  }

  return (
    <LiveRegionProvider>
      <ConfirmDialogProvider>
        <a className="skip-link" href="#main-content">
          Zum Hauptinhalt springen
        </a>
        <div className="industrial-shell min-h-screen text-zinc-100">
          <aside
            className="industrial-sidebar"
            aria-label="Gremia.SBV Navigation und Sitzung"
          >
            <div className="brand-block">
              <div className="brand-mark">SBV</div>
              <div>
                <strong>Gremia.SBV</strong>
                <span>LOCAL</span>
              </div>
            </div>
            <ShellNav current={currentView} onNavigate={setCurrentView} />
            <button
              type="button"
              className="industrial-lock-button"
              onClick={async () => {
                try {
                  await window.gremiaSbv?.security?.lock?.();
                } catch {
                  // no-op
                }
                switchToLockedSession();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sperren
            </button>
            <div
              className="industrial-version-badge"
              aria-label={`Gremia.SBV Version ${APP_VERSION}`}
            >
              <span>Version</span>
              <strong>{APP_VERSION}</strong>
            </div>
          </aside>

          <main id="main-content" className="industrial-content" tabIndex={-1}>
            <header className="industrial-topbar">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">
                  Arbeitsplatz
                </p>
                <h2>
                  {currentView === "dashboard"
                    ? "Dashboard"
                    : currentView === "settings"
                      ? "Einstellungen"
                      : currentModule?.title}
                </h2>
              </div>
              <div className="industrial-state">
                <CheckCircle2 className="h-4 w-4 text-yellow-300" />
                entsperrt · {nowLabel()}
              </div>
            </header>

            {dataError && (
              <div className="industrial-message industrial-message-warning mb-4">
                {dataError}
              </div>
            )}
            {currentView === "dashboard" && (
              <>
                <DashboardFocusOverview
                  onNavigate={setCurrentView}
                  cases={cases}
                  deadlines={deadlines}
                  dashboardItems={dashboardDeadlines}
                  onEditDeadline={(deadline) => setSelectedDeadline(deadline)}
                  onCompleteDeadline={(deadline) => void completeDeadline(deadline)}
                />
              </>
            )}
            {currentView === "cases" && (
              <CasesView
                cases={cases}
                contacts={contacts}
                protectedPersons={persons}
                target={caseNodeTarget}
                onCreateCase={createCase}
                onCreateDeadline={createDeadline}
                onCreateContact={createContact}
                onCasesChanged={reloadWorkData}
                onTargetConsumed={() => setCaseNodeTarget(null)}
              />
            )}
            {currentView === "deadlines" && (
              <DeadlinesView
                cases={cases}
                measures={caseMeasures}
                deadlines={deadlines}
                onCreateDeadline={createDeadline}
                onEditDeadline={(deadline) => setSelectedDeadline(deadline)}
                onCompleteDeadline={(deadline) =>
                  void completeDeadline(deadline)
                }
                onExportIcal={(privacyLevel, filters) => icalHandlers.exportIcal({ privacyLevel, filters })}
              />
            )}
            {currentView === "persons" && (
              <PersonsView
                persons={persons}
                cases={cases}
                onCreateCaseForPerson={async (person, input) => {
                  await createCase({ ...input, protectedPersonId: person.id, personBindingState: person.recordKind === "pseudonymous_request" ? "anonymous_request" : "active", isPseudonymized: true });
                }}
                onCreate={personHandlers.createProtectedPerson}
                onUpdate={personHandlers.updateProtectedPerson}
                onSelectImportFile={personHandlers.selectProtectedPersonImportFile}
                onPreviewImport={personHandlers.previewProtectedPersonsImport}
                onExecuteImport={personHandlers.executeProtectedPersonsImport}
                onEvaluateExpiry={personHandlers.evaluateProtectedPersonExpiry}
                onExportIcal={personHandlers.exportDeadlinesAsIcal}
                onListOpenPrivacyReviews={personHandlers.listOpenPrivacyReviewsForPerson}
                onDocumentRetention={personHandlers.documentPrivacyRetention}
                onScheduleReviewLater={personHandlers.schedulePrivacyReviewLater}
                onClearReview={personHandlers.clearPrivacyReview}
                onAnonymizeReviewCase={personHandlers.anonymizePrivacyReviewCase}
                onDeleteReviewCase={personHandlers.deletePrivacyReviewCase}
                onAnonymizePerson={personHandlers.anonymizeProtectedPerson}
                onDeletePerson={personHandlers.deleteProtectedPerson}
              />
            )}
            {currentView === "contacts" && (
              <ContactsView
                contacts={contacts}
                onCreateContact={createContact}
                onDeleteContact={deleteContact}
              />
            )}
            {currentView === "knowledge" && <KnowledgeView cases={cases} />}
            {currentView === "bem" && (
              <BemView cases={cases} onOpenCaseNode={openCaseNode} />
            )}
            {currentView === "prevention" && (
              <PreventionView cases={cases} onOpenCaseNode={openCaseNode} />
            )}
            {currentView === "participation" && (
              <ParticipationView cases={cases} onOpenCaseNode={openCaseNode} />
            )}

            {currentView === "workplace_accommodation" && (
              <WorkplaceAccommodationContainer onOpenCaseNode={openCaseNode} />
            )}
            {currentView === "equalization" && (
              <EqualizationView cases={cases} onOpenCaseNode={openCaseNode} />
            )}
            {currentView === "termination_hearing" && (
              <TerminationView cases={cases} onOpenCaseNode={openCaseNode} />
            )}
            {currentView === "templates" && <TemplatesView />}
            {currentView === "sbv_control" && <SbvControlView cases={cases} deadlines={deadlines} onNavigate={setCurrentView} />}
            {currentView === "reports" && <ReportsView />}
            {currentView === "compliance" && <ComplianceView />}
            {currentView === "settings" && (
              <SettingsHub
                theme={theme}
                onThemeChange={setTheme}
                cases={cases}
              />
            )}
            {!isImplementedView(currentView) && currentModule && (
              <PlaceholderView view={currentModule} />
            )}
            <GlobalTextCommandController cases={cases} contacts={contacts} />
            <TextCommandHelpModal />
            {selectedDeadline && (
              <DeadlineEditor
                deadline={selectedDeadline}
                cases={cases}
                onClose={() => setSelectedDeadline(null)}
                onSave={updateDeadline}
                onComplete={completeDeadline}
              />
            )}
          </main>
        </div>
      </ConfirmDialogProvider>
    </LiveRegionProvider>
  );
}
