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
import { ObligationsList } from './components/ObligationsList';
import { InclusionPanel } from './components/InclusionPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { ProtocolSection } from './components/ProtocolSection';
import { useSbvResources } from './hooks/useSbvResources';
import { useSbvControlProtocols } from './hooks/useSbvControlProtocols';
import {
  countCriticalParticipation,
  monthLabel,
} from './sbvControlLogic';
import {
  employerObligations,
  inclusionTopics,
  type ControlSectionId,
} from './sbvControlTypes';

type SbvControlViewProps = {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  onNavigate?: (viewId: ViewId) => void;
};

export function SbvControlView({
  cases,
  deadlines,
  onNavigate,
}: SbvControlViewProps) {
  const [participations, setParticipations] = useState<ParticipationRecord[]>([]);
  const [activeSection, setActiveSection] = useState<ControlSectionId>('resources');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const resourcesState = useSbvResources();
  const protocolsState = useSbvControlProtocols();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const bridge = await waitForBridge();
        if (!active) return;
        if (bridge?.participation) setParticipations(await bridge.participation.list());
        await resourcesState.loadResources();
        await protocolsState.loadProtocols();
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'SBV-Steuerungsdaten konnten nicht geladen werden.',
          );
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [cases.length, resourcesState.loadResources, protocolsState.loadProtocols]);

  const openDeadlines = deadlines.filter((deadline) => deadline.status !== 'done').length;
  const criticalParticipation = useMemo(
    () => countCriticalParticipation(participations),
    [participations],
  );
  const privacyReviewCases = cases.filter((item) => item.privacyReviewRequired).length;
  const reportHints = [
    { label: 'Fallakten im Arbeitsbestand', value: cases.length },
    { label: 'Beteiligungsvorgänge', value: participations.length },
    { label: 'Steuerungsprotokolle', value: protocolsState.protocols.length },
    { label: 'offene Fristen / Wiedervorlagen', value: openDeadlines },
    { label: 'Akten mit Datenschutzprüfung', value: privacyReviewCases },
  ];

  const sectionTabs: Array<{
    id: ControlSectionId;
    title: string;
    summary: string;
  }> = [
    {
      id: 'resources',
      title: 'Nachweise',
      summary: `${resourcesState.resources.length} Einträge`,
    },
    {
      id: 'protocols',
      title: 'Protokolle',
      summary: `${protocolsState.openProtocolFollowUps} offen`,
    },
    {
      id: 'participation',
      title: 'Beteiligung',
      summary: `${criticalParticipation} kritisch`,
    },
    {
      id: 'obligations',
      title: 'Arbeitgeberpflichten',
      summary: `${employerObligations.length} Prüfpunkte`,
    },
    {
      id: 'inclusion',
      title: 'Inklusionsvereinbarung',
      summary: `${inclusionTopics.length} Regelungsfelder`,
    },
    {
      id: 'reports',
      title: 'Berichte',
      summary: `${monthLabel()}`,
    },
  ];

  function handleOperationResult(result: { ok: boolean; message: string }) {
    setError(result.ok ? '' : result.message);
    setNotice(result.ok ? result.message : '');
  }

  return (
    <WorkbenchPage
      title="SBV-Steuerung"
      kicker="Arbeitsplatz"
      description="Arbeitsnachweise, Kontrollpunkte und Einstiege in bestehende Module. Kein Ersatz für Fallakten."
    >
      <ModuleFeedback
        items={[
          error ? { id: 'sbv-control-error', tone: 'warning', message: error } : null,
          notice ? { id: 'sbv-control-notice', tone: 'success', message: notice } : null,
        ]}
      />
      <WorkbenchSummary
        ariaLabel="SBV-Steuerung Kennzahlen"
        items={[
          { label: 'Nachweise', value: resourcesState.resources.length, tone: 'default' },
          {
            label: 'Steuerungsprotokolle',
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
        ariaLabel="SBV-Steuerung Arbeitsbereiche"
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
            ariaLabel="SBV-Steuerung Arbeitsbereiche"
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
        {activeSection === 'obligations' && <ObligationsList />}
        {activeSection === 'inclusion' && <InclusionPanel />}
        {activeSection === 'reports' && (
          <ReportsPanel reportHints={reportHints} onNavigate={onNavigate} />
        )}
      </WorkbenchWorkspace>
    </WorkbenchPage>
  );
}
