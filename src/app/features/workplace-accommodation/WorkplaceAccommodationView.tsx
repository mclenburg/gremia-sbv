import { AlertTriangle, FolderOpen, Wrench } from 'lucide-react';
import type { WorkplaceAccommodationRecord } from '../../core/models/workplace-accommodation.model';
import { workplaceAccommodationCategoryLabels, workplaceAccommodationStatusLabels } from '../../core/models/workplace-accommodation.model';
import { WorkbenchDetailPanel, WorkbenchGrid, WorkbenchListPanel, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';

export function WorkplaceAccommodationView({
  items,
  onOpenCase
}: {
  items: WorkplaceAccommodationRecord[];
  onOpenCase: (caseId: string, processId?: string) => void;
}) {
  const open = items.filter((item) => item.status !== 'abgeschlossen').length;
  const critical = items.filter((item) => item.riskLevel === 'kritisch' || item.status === 'arbeitgeber_lehnt_ab' || item.status === 'eskaliert').length;
  const employerOpen = items.filter((item) => item.employerResponseStatus === 'offen' && item.status !== 'abgeschlossen').length;
  const reviewDue = items.filter((item) => item.effectivenessReviewAt && new Date(item.effectivenessReviewAt) <= new Date() && item.status === 'wirksamkeitspruefung').length;

  return (
    <div className="workplace-accommodation-workbench">
      <WorkbenchSummary
        ariaLabel="Arbeitsplatzgestaltung Kennzahlen"
        items={[
          { label: 'offen', value: open },
          { label: 'kritisch / eskaliert', value: critical, tone: critical ? 'danger' : 'default' },
          { label: 'AG-Reaktion offen', value: employerOpen, tone: employerOpen ? 'warning' : 'default' },
          { label: 'Wirksamkeitsprüfung fällig', value: reviewDue, tone: reviewDue ? 'warning' : 'default' }
        ]}
      />

      <WorkbenchGrid>
        <WorkbenchListPanel ariaLabel="Arbeitsplatzgestaltung über alle Fallakten">
          <div className="workbench-panel-head">
            <h2><Wrench className="mr-2 inline h-5 w-5" />Arbeitsplatzgestaltung</h2>
            <p>Übersicht über fallaktenbezogene Maßnahmen nach § 164 Abs. 4 SGB IX. Anlage und Bearbeitung erfolgen in der Fallakte.</p>
          </div>
          <div className="industrial-list compact">
            {items.map((item) => (
              <button key={item.id} type="button" className="industrial-list-item" onClick={() => onOpenCase(item.caseId, item.id)}>
                <strong>{item.title}</strong>
                <span>{workplaceAccommodationCategoryLabels[item.category]} · {workplaceAccommodationStatusLabels[item.status]} · Risiko {item.riskLevel}</span>
                <small>{item.nextStep || item.requestedAdjustment || 'Fallakte öffnen und Maßnahme fortschreiben.'}</small>
              </button>
            ))}
            {!items.length && <div className="industrial-empty">Noch keine Arbeitsplatzgestaltungsmaßnahmen. Lege sie direkt in einer Fallakte über „Arbeitsplatz“ oder /anp an.</div>}
          </div>
        </WorkbenchListPanel>

        <WorkbenchDetailPanel ariaLabel="Hinweise zur Arbeitsplatzgestaltung">
          <div className="workbench-panel-head">
            <h2>Arbeitsort bleibt die Fallakte</h2>
            <p>Dieses Cockpit dient nur der Übersicht. Die fachliche Dokumentation, Fristen und Nachbearbeitung erfolgen im Maßnahmenbereich der jeweiligen Fallakte.</p>
          </div>
          <div className="industrial-message industrial-message-info"><FolderOpen className="h-4 w-4" /> Öffne eine Maßnahme, um direkt in die Fallakte zu springen.</div>
          <div className="industrial-message industrial-message-warning"><AlertTriangle className="h-4 w-4" /> Bei Ablehnung oder Verzögerung: Inklusionsamt, Reha-Träger und Beteiligungsrechte prüfen.</div>
        </WorkbenchDetailPanel>
      </WorkbenchGrid>
    </div>
  );
}
