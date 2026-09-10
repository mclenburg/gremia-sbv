import { Upload } from 'lucide-react';
import type { MobileCompanionReturnInspectResult, MobileCompanionReturnPlanItem } from '../../../domain/models/mobile-companion.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { useMobileReturnImportWorkflow } from './useMobileReturnImportWorkflow';

function dispositionLabel(item: MobileCompanionReturnPlanItem): string {
  if (item.disposition === 'apply') return 'Übernehmen';
  if (item.disposition === 'already_done') return 'Bereits erledigt';
  if (item.disposition === 'conflict') return 'Konflikt';
  return 'Nicht übernehmbar';
}

function PlanTable({ inspection }: { inspection: MobileCompanionReturnInspectResult }) {
  return <div className="industrial-table-shell">
    <table className="industrial-table">
      <thead>
        <tr>
          <th>Änderung</th>
          <th>Status</th>
          <th>Einordnung</th>
        </tr>
      </thead>
      <tbody>
        {inspection.plan.map((item) => (
          <tr key={`${item.mobileId}-${item.type}`}>
            <td>{item.type === 'create_note' ? 'Notiz' : item.type === 'create_deadline' ? 'Frist' : 'Frist erledigen'}</td>
            <td>{dispositionLabel(item)}</td>
            <td>{item.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>;
}

export function MobileReturnImportPanel({ onImported }: { onImported?: () => Promise<void> }) {
  const workflow = useMobileReturnImportWorkflow(onImported);
  const inspection = workflow.selected?.inspection;
  return <IndustrialPanel
    ariaLabel="Mobile Rückgabe importieren"
    kicker="Rückgabe"
    title="Mobile Änderungen übernehmen"
    description="Notizen und Friständerungen aus Besprechungen werden zuerst geprüft und erst danach in den Desktop-Tresor übernommen."
    helpId="caseHandover.mobile"
    actions={<IndustrialButton onClick={() => void workflow.selectReturnFile()} loading={workflow.busy}>
      <Upload className="industrial-icon" aria-hidden="true" /> Mobile Rückgabe auswählen
    </IndustrialButton>}
  >
    <div className="industrial-stack">
      {workflow.error ? <div className="industrial-message industrial-message-warning" role="alert">{workflow.error}</div> : null}
      {workflow.message ? <div className="industrial-message industrial-message-ok" role="status">{workflow.message}</div> : null}
      {workflow.result ? <div className="industrial-message industrial-message-ok" role="status">
        Übernommen: {workflow.result.createdNoteCount} Notiz(en), {workflow.result.createdDeadlineCount} neue Frist(en), {workflow.result.completedDeadlineCount} erledigte Frist(en).
      </div> : null}
      {inspection ? <>
        <div className="workbench-summary-grid" aria-label="Mobile Rückgabe Übersicht">
          <div className="workbench-summary-card"><span>{inspection.noteCount}</span><strong>Notizen</strong></div>
          <div className="workbench-summary-card"><span>{inspection.deadlineCount}</span><strong>Neue Fristen</strong></div>
          <div className="workbench-summary-card"><span>{inspection.completedDeadlineCount}</span><strong>Erledigungen</strong></div>
          <div className="workbench-summary-card"><span>{inspection.conflictCount + inspection.rejectedCount}</span><strong>Klärungen</strong></div>
        </div>
        <p className="industrial-meta">
          Datei: {workflow.selected?.fileName} · Mobilgerät: {inspection.sourceDeviceLabel ?? inspection.sourceInstanceId}
        </p>
        <PlanTable inspection={inspection} />
        <div className="industrial-action-row">
          <ToolbarButton onClick={workflow.clearSelection} disabled={workflow.busy}>Abbrechen</ToolbarButton>
          <IndustrialButton onClick={() => void workflow.importSelected()} loading={workflow.busy} disabled={!inspection.canImport}>
            Mobile Änderungen übernehmen
          </IndustrialButton>
        </div>
      </> : <p className="industrial-meta">Noch keine mobile Rückgabedatei geprüft.</p>}
    </div>
  </IndustrialPanel>;
}
