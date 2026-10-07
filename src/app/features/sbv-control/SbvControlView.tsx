import { useEffect, useMemo, useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { DeadlineRecord } from '../../../domain/models/deadline.model';
import type { ParticipationRecord } from '../../../domain/models/participation.model';
import type { ViewId } from '../../core/navigation/modules';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import {
  WorkbenchNavigation,
  WorkbenchPage,
  WorkbenchSummary,
  WorkbenchWorkspace,
} from '../../shared/components/WorkbenchLayout';
import { ResourceSection } from './components/ResourceSection';
import { ParticipationPanel } from './components/ParticipationPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { SbvOfficeSections } from './components/SbvOfficeSections';
import { ProtocolSection } from './components/ProtocolSection';
import { useSbvResources } from './hooks/useSbvResources';
import { useSbvControlProtocols, useSbvControlProtocolTarget } from './hooks/useSbvControlProtocols';
import { useSbvOfficeWorkflows, useSbvOfficeRecordTarget, type SbvOfficeRecordTarget } from './hooks/useSbvOfficeWorkflows';
import {
  countCriticalParticipation,
  buildSbvControlReportHints,
  monthLabel,
} from './sbvControlLogic';
import { buildSbvControlSections, type ControlSectionId } from './sbvControlSections';

type SbvControlViewProps = {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  onNavigate?: (viewId: ViewId) => void;
  initialSection?: ControlSectionId;
  targetProtocolId?: string;
  targetOffice?: SbvOfficeRecordTarget;
  onTargetConsumed?: () => void;
};

export function SbvControlView({
  cases,
  deadlines,
  onNavigate,
  initialSection = 'resources',
  targetProtocolId,
  targetOffice,
  onTargetConsumed,
}: SbvControlViewProps) {
  const [participations, setParticipations] = useState<ParticipationRecord[]>([]);
  const [activeSection, setActiveSection] = useState<ControlSectionId>(initialSection);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [protocolsLoaded, setProtocolsLoaded] = useState(false);
  const resourcesState = useSbvResources();
  const protocolsState = useSbvControlProtocols();
  const officeState = useSbvOfficeWorkflows();
  const { loadResources } = resourcesState;
  const { loadProtocols } = protocolsState;
  const { load: loadOfficeWorkflows } = officeState;
  useSbvControlProtocolTarget({ targetProtocolId, onTargetConsumed, protocolsLoaded, protocolsState, setActiveSection, setError });
  const selectedOfficeTarget = useSbvOfficeRecordTarget({ target: targetOffice, onTargetConsumed, loaded: officeState.loaded, obligations: officeState.obligations, agreements: officeState.agreements, assemblies: officeState.assemblies, meetings: officeState.meetings, setActiveSection, setError });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const bridge = await waitForBridge();
        if (!active) return;
        if (bridge?.participation) setParticipations(await bridge.participation.list());
        await loadResources();
        await loadProtocols();
        if (active) setProtocolsLoaded(true);
        await loadOfficeWorkflows();
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'SBV-Dokumentationsdaten konnten nicht geladen werden.',
          );
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [cases.length, loadResources, loadProtocols, loadOfficeWorkflows]);

  const criticalParticipation = useMemo(() => countCriticalParticipation(participations), [participations]);
  const privacyReviewCases = cases.filter((item) => item.privacyReviewRequired).length;
  const reportHints = buildSbvControlReportHints(cases.length, participations.length, protocolsState.protocols.length, deadlines.filter((item) => item.status !== 'done').length, privacyReviewCases);

  const sectionTabs = buildSbvControlSections({
    resources: resourcesState.resources.length, meetings: officeState.meetings.length, assemblies: officeState.assemblies.length, assemblyWarning: officeState.assemblyWarning,
    complaints: officeState.complaints.length, openProtocolFollowUps: protocolsState.openProtocolFollowUps, criticalParticipation,
    obligations: officeState.obligations.length, agreements: officeState.agreements.length, month: monthLabel(),
  });

  function handleOperationResult(result: { ok: boolean; message: string }) {
    setError(result.ok ? '' : result.message);
    setNotice(result.ok ? result.message : '');
  }

  return (
    <WorkbenchPage
      title={initialSection === 'meetings' ? 'Gremiensitzungen' : 'SBV-Dokumentation'}
      kicker="SBV-Arbeit"
      description={initialSection === 'meetings' ? 'BR- und Ausschusssitzungen aus eigener SBV-Sicht vorbereiten, begleiten und dokumentieren.' : 'Sitzungen, Protokolle, Nachweise, Arbeitgeberpflichten und weitere übergreifende SBV-Dokumentation. Kein Ersatz für Fallakten.'}
      helpId={initialSection === 'meetings' ? 'sbvOffice.meetings' : 'sbvOffice.overview'}
    >
      <SbvControlMessages error={error} notice={notice} />
      <SbvControlSummary
        resources={resourcesState.resources.length}
        protocols={protocolsState.protocols.length}
        openProtocolFollowUps={protocolsState.openProtocolFollowUps}
        openResourceRequests={resourcesState.openResourceRequests}
        criticalParticipation={criticalParticipation}
        privacyReviewCases={privacyReviewCases}
      />

      <WorkbenchWorkspace
        ariaLabel="SBV-Dokumentation Arbeitsbereiche"
        ariaLive="polite"
        navigation={
          <WorkbenchNavigation
            items={sectionTabs.map((tab) => ({
              id: tab.id,
              title: tab.title,
              description: tab.summary,
            }))}
            active={activeSection}
            onChange={setActiveSection}
            ariaLabel="SBV-Dokumentation Arbeitsbereiche"
          />
        }
      >
        {activeSection === 'resources' && (
          <ResourceSection state={resourcesState} onOperationResult={handleOperationResult} />
        )}
        {activeSection === 'protocols' && (
          <ProtocolSection state={protocolsState} onOperationResult={handleOperationResult} />
        )}
        {activeSection === 'participation' && (
          <ParticipationPanel participations={participations} onNavigate={onNavigate} />
        )}
        <SbvOfficeSections activeSection={activeSection} cases={cases} state={officeState} onNotice={setNotice} selectedOfficeTarget={selectedOfficeTarget} />
        {activeSection === 'reports' && (
          <ReportsPanel reportHints={reportHints} onNavigate={onNavigate} />
        )}
      </WorkbenchWorkspace>
    </WorkbenchPage>
  );
}

function SbvControlSummary({
  resources,
  protocols,
  openProtocolFollowUps,
  openResourceRequests,
  criticalParticipation,
  privacyReviewCases,
}: {
  resources: number;
  protocols: number;
  openProtocolFollowUps: number;
  openResourceRequests: number;
  criticalParticipation: number;
  privacyReviewCases: number;
}) {
  return (
    <WorkbenchSummary
      ariaLabel="SBV-Dokumentation Kennzahlen"
      items={[
        { label: 'Nachweise', value: resources, tone: 'default' },
        { label: 'Protokolle', value: protocols, tone: openProtocolFollowUps > 0 ? 'warning' : 'default' },
        { label: 'offene Ressourcenanfragen', value: openResourceRequests, tone: openResourceRequests > 0 ? 'warning' : 'default' },
        { label: 'kritische Beteiligungen', value: criticalParticipation, tone: criticalParticipation > 0 ? 'danger' : 'default' },
        { label: 'Datenschutzprüfungen', value: privacyReviewCases, tone: privacyReviewCases > 0 ? 'warning' : 'default' },
      ]}
      actions={<span className="industrial-meta">Monatsblick {monthLabel()}</span>}
    />
  );
}

function SbvControlMessages({ error, notice }: { error: string; notice: string }) {
  return (
    <ModuleFeedback
      items={[
        error ? { id: 'sbv-control-error', tone: 'warning', message: error } : null,
        notice ? { id: 'sbv-control-notice', tone: 'success', message: notice } : null,
      ]}
    />
  );
}
