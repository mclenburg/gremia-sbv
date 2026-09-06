import type { CaseHandoverCockpit } from '../../../domain/models/case-handover.model';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { EmptyState } from '../../shared/components/WorkbenchData';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import type { CaseHandoverTabId } from './caseHandoverTabs';

export function HandoverOverviewTab({
  cockpit,
  onSelectTab,
}: {
  cockpit: CaseHandoverCockpit;
  onSelectTab: (tabId: CaseHandoverTabId) => void;
}) {
  const hasOpenWork = cockpit.returnableCount > 0 || cockpit.expiredVacationCount > 0;

  return (
    <IndustrialPanel
      kicker="Arbeitssteuerung"
      title="Was ist als Nächstes zu tun?"
      description="Wähle den passenden Übergabeablauf. Die eigentlichen Formulare bleiben getrennt, damit keine Urlaubsvertretung, Rückgabe und Amtsübergabe vermischt werden."
      helpId="caseHandover.overview"
    >
      <div className="handover-overview-actions" aria-label="Übergabe-Einstiege">
        <IndustrialButton type="button" onClick={() => onSelectTab('vacation')}>
          Urlaubsvertretung übergeben
        </IndustrialButton>
        <IndustrialButton type="button" variant="secondary" onClick={() => onSelectTab('import')}>
          Paket importieren
        </IndustrialButton>
        <IndustrialButton type="button" variant="secondary" onClick={() => onSelectTab('return')} disabled={!cockpit.returnableCount}>
          Rückgabe-Delta erstellen
        </IndustrialButton>
        <IndustrialButton type="button" variant="secondary" onClick={() => onSelectTab('office')}>
          Amtsübergabe starten
        </IndustrialButton>
      </div>
      {hasOpenWork ? (
        <div className="industrial-message industrial-message-warning" role="status">
          {cockpit.returnableCount > 0 ? `${cockpit.returnableCount} Vertretung(en) können zurückgegeben werden. ` : null}
          {cockpit.expiredVacationCount > 0 ? `${cockpit.expiredVacationCount} Vertretung(en) sind abgelaufen und müssen fachlich geprüft werden.` : null}
        </div>
      ) : (
        <EmptyState
          title="Keine offene Übergabeaktion"
          text="Du kannst eine neue Urlaubsvertretung, eine Amtsübergabe oder den Import eines geprüften Pakets starten."
        />
      )}
    </IndustrialPanel>
  );
}
