import { useEffect, useMemo, useState } from 'react';
import type { CaseRecord } from '../../core/models/case.model';
import type { DeadlineRecord } from '../../core/models/deadline.model';
import type { ParticipationRecord } from '../../core/models/participation.model';
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
import { useSbvControlProtocols } from './hooks/useSbvControlProtocols';
import { useSbvOfficeWorkflows } from './hooks/useSbvOfficeWorkflows';
import {
  countCriticalParticipation,
  monthLabel,
} from './sbvControlLogic';
import { buildSbvControlSections, type ControlSectionId } from './sbvControlSections';

type SbvControlViewProps = {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  onNavigate?: (viewId: ViewId) => void;
  initialSection?: ControlSectionId;
};

export function SbvControlView({
  cases,
  deadlines,
  onNavigate,
  initialSection = 'resources',
}: SbvControlViewProps) {
  const [participations, setParticipations] = useState<ParticipationRecord[]>([]);
  const [activeSection, setActiveSection] = useState<ControlSectionId>(initialSection);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const resourcesState = useSbvResources();
  const protocolsState = useSbvControlProtocols();
  const officeState = useSbvOfficeWorkflows();
  const { loadResources } = resourcesState;
  const { loadProtocols } = protocolsState;
  const { load: loadOfficeWorkflows } = officeState;

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const bridge = await waitForBridge();
        if (!active) return;
        if (bridge?.participation) setParticipations(await bridge.participation.list());
        await loadResources();
        await loadProtocols();
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

  const openDeadlines = deadlines.filter((deadline) => deadline.status !== 'done').length;
  const criticalParticipation = useMemo(
    () => countCriticalParticipation(participations),
    [participations],
  );
  const privacyReviewCases = cases.filter((item) => item.privacyReviewRequired).length;
  const reportHints = [
    { label: 'Fallakten im Arbeitsbestand', value: cases.length },
    { label: 'Beteiligungsvorgänge', value: participations.length },
    { label: 'Protokolle', value: protocolsState.protocols.length },
    { label: 'offene Fristen / Wiedervorlagen', value: openDeadlines },
    { label: 'Akten mit Datenschutzprüfung', value: privacyReviewCases },
  ];

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
      description={initialSection === 'meetings'
        ? 'BR- und Ausschusssitzungen aus eigener SBV-Sicht vorbereiten, begleiten und dokumentieren.'
        : 'Sitzungen, Protokolle, Nachweise, Arbeitgeberpflichten und weitere übergreifende SBV-Dokumentation. Kein Ersatz für Fallakten.'}
    >
      <ModuleFeedback
        items={[
          error ? { id: 'sbv-control-error', tone: 'warning', message: error } : null,
          notice ? { id: 'sbv-control-notice', tone: 'success', message: notice } : null,
        ]}
      />
      <WorkbenchSummary
        ariaLabel="SBV-Dokumentation Kennzahlen"
        items={[
          { label: 'Nachweise', value: resourcesState.resources.length, tone: 'default' },
          {
            label: 'Protokolle',
            value: protocolsState.protocols.length,
            tone: protocolsState.openProtocolFollowUps > 0 ? 'warning' : 'default',
          },
          {
            label: 'offene Ressourcenanfragen',
            value: resourcesState.openResourceRequests,
            tone: resourcesState.openResourceRequests > 0 ? 'warning' : 'default',
          },
          {
            label: 'kritische Beteiligungen',
            value: criticalParticipation,
            tone: criticalParticipation > 0 ? 'danger' : 'default',
          },
          {
            label: 'Datenschutzprüfungen',
            value: privacyReviewCases,
            tone: privacyReviewCases > 0 ? 'warning' : 'default',
          },
        ]}
        actions={<span className="industrial-meta">Monatsblick {monthLabel()}</span>}
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
        <SbvOfficeSections activeSection={activeSection} cases={cases} state={officeState} onNotice={setNotice} />
        {activeSection === 'reports' && (
          <ReportsPanel reportHints={reportHints} onNavigate={onNavigate} />
        )}
      </WorkbenchWorkspace>
    </WorkbenchPage>
  );
}
