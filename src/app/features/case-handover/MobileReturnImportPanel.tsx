import { Upload } from 'lucide-react';
import type { MobileCompanionReturnConflictDecision, MobileCompanionReturnInspectResult, MobileCompanionReturnPlanItem } from '../../../domain/models/mobile-companion.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { useMobileReturnImportWorkflow } from './useMobileReturnImportWorkflow';
import { areMobileReturnConflictsResolved } from './mobileReturnConflictPolicy';

function dispositionLabel(item: MobileCompanionReturnPlanItem): string {
  if (item.disposition === 'apply') return 'Übernehmen';
  if (item.disposition === 'already_done') return 'Bereits erledigt';
  if (item.disposition === 'conflict') return 'Konflikt';
  return 'Nicht übernehmbar';
}

function PlanTable({ inspection, decisions, onDecision }: {
  inspection: MobileCompanionReturnInspectResult;
  decisions: Record<string, MobileCompanionReturnConflictDecision>;
  onDecision: (mobileId: string, decision: MobileCompanionReturnConflictDecision) => void;
}) {
  const typeLabel = (item: MobileCompanionReturnPlanItem): string => {
    if (item.type === 'create_note') return 'Notiz';
    if (item.type === 'create_inbox') return 'Fallfreier Eintrag';
    if (item.type === 'create_deadline') return 'Frist';
    return 'Frist erledigen';
  };
  return <div className="industrial-table-shell">
    <table className="industrial-table">
      <thead>
        <tr>
          <th>Änderung</th>
          <th>Status</th>
          <th>Einordnung</th>
          <th>Entscheidung</th>
        </tr>
      </thead>
      <tbody>
        {inspection.plan.map((item) => (
          <tr key={`${item.mobileId}-${item.type}`}>
            <td>{typeLabel(item)}</td>
            <td>{dispositionLabel(item)}</td>
            <td>{item.summary}{item.desktopState || item.mobileChange ? <div className="industrial-stack industrial-meta">
              {item.desktopState ? <span>{item.desktopState}</span> : null}
              {item.mobileChange ? <span>{item.mobileChange}</span> : null}
            </div> : null}</td>
            <td>{item.disposition === 'conflict' ? <label className="industrial-field">
              <span className="industrial-sr-only">Entscheidung für {item.summary}</span>
              <select
                className="industrial-select"
                value={decisions[item.mobileId] ?? ''}
                onChange={(event) => onDecision(item.mobileId, event.target.value as MobileCompanionReturnConflictDecision)}
              >
                <option value="" disabled>Bitte entscheiden</option>
                <option value="keep_desktop">Desktop-Stand behalten</option>
                <option value="apply_mobile">Mobile Änderung übernehmen</option>
              </select>
            </label> : <span className="industrial-meta">Keine Entscheidung nötig</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>;
}

export function MobileReturnImportPanel({ onImported }: { onImported?: () => Promise<void> }) {
  const workflow = useMobileReturnImportWorkflow(onImported);
  const inspection = workflow.selected?.inspection;
  const allConflictsDecided = inspection
    ? areMobileReturnConflictsResolved(inspection, workflow.conflictDecisions)
    : false;
  return <IndustrialPanel
    ariaLabel="Mobile Rückgabe importieren"
    kicker="Rückgabe"
    title="Mobile Änderungen übernehmen"
    description="Notizen und Friständerungen aus Besprechungen werden zuerst geprüft und erst danach in den Desktop-Tresor übernommen."
    helpId="caseHandover.mobileReturn"
    actions={<IndustrialButton onClick={() => void workflow.selectReturnFile()} loading={workflow.busy}>
      <Upload className="industrial-icon" aria-hidden="true" /> Mobile Rückgabe auswählen
    </IndustrialButton>}
  >
    <div className="industrial-stack">
      {workflow.error ? <div className="industrial-message industrial-message-warning" role="alert">{workflow.error}</div> : null}
      {workflow.message ? <div className="industrial-message industrial-message-ok" role="status">{workflow.message}</div> : null}
      {workflow.result ? <div className="industrial-message industrial-message-ok" role="status">
        Übernommen: {workflow.result.createdNoteCount} Notiz(en), {workflow.result.createdInboxCount} fallfreie Einträge, {workflow.result.createdDeadlineCount} neue Frist(en), {workflow.result.completedDeadlineCount} erledigte Frist(en). Desktop-Stand beibehalten: {workflow.result.skippedConflictCount}.
      </div> : null}
      {inspection ? <>
        <div className="workbench-summary-grid" aria-label="Mobile Rückgabe Übersicht">
          <div className="workbench-summary-card"><span>{inspection.noteCount}</span><strong>Notizen</strong></div>
          <div className="workbench-summary-card"><span>{inspection.inboxCount}</span><strong>Fallfrei</strong></div>
          <div className="workbench-summary-card"><span>{inspection.deadlineCount}</span><strong>Neue Fristen</strong></div>
          <div className="workbench-summary-card"><span>{inspection.completedDeadlineCount}</span><strong>Erledigungen</strong></div>
          <div className="workbench-summary-card"><span>{inspection.conflictCount + inspection.rejectedCount}</span><strong>Klärungen</strong></div>
        </div>
        <p className="industrial-meta">
          Datei: {workflow.selected?.fileName} · Mobilgerät: {inspection.sourceDeviceLabel ?? inspection.sourceInstanceId}
        </p>
        <PlanTable inspection={inspection} decisions={workflow.conflictDecisions} onDecision={workflow.setConflictDecision} />
        <div className="industrial-action-row">
          <ToolbarButton onClick={workflow.clearSelection} disabled={workflow.busy}>Abbrechen</ToolbarButton>
          <IndustrialButton onClick={() => void workflow.importSelected()} loading={workflow.busy} disabled={!inspection.canImport || !allConflictsDecided}>
            Mobile Änderungen übernehmen
          </IndustrialButton>
        </div>
      </> : <p className="industrial-meta">Noch keine mobile Rückgabedatei geprüft.</p>}
    </div>
  </IndustrialPanel>;
}
