import type { CaseRecord } from '../../../domain/models/case.model';
import type { GremiaBrDashboardOverview, GremiaBrExternalReferenceRecord, GremiaBrInformationRequest, GremiaBrProcedureDetail } from '../../../domain/models/gremia-br.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchableSelectInput, SelectInput } from '../../shared/components/IndustrialForm';
import { DataTable, EmptyState } from '../../shared/components/WorkbenchLayout';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { caseOptions } from './gremiaBrWorkspaceModel';

const STATE_LABELS: Record<string, string> = {
  RECEIVED: 'Eingegangen', UNDER_REVIEW: 'In Prüfung', INFORMATION_REQUESTED: 'Information angefordert',
  READY: 'Bereit', IN_PROGRESS: 'In Bearbeitung', DECISION_PENDING: 'Entscheidung ausstehend',
  DECIDED: 'Entschieden', COMMUNICATION_PENDING: 'Mitteilung ausstehend', COMMUNICATED: 'Mitgeteilt',
  COMPLETED: 'Abgeschlossen', CANCELLED: 'Abgebrochen',
};
const REQUEST_STATUS_LABELS: Record<GremiaBrInformationRequest['status'], string> = {
  OPEN: 'Offen', PARTIALLY_FULFILLED: 'Teilweise erfüllt', FULFILLED: 'Erfüllt', WITHDRAWN: 'Zurückgezogen',
};

function procedureTypeLabel(value: string): string {
  if (value === 'SBV_PARTICIPATION') return 'SBV-Beteiligung';
  return 'Verfahren';
}

export function GremiaBrProcedureLinksPanel({
  cases, overview, localCaseId, remoteCaseId, procedureId, detail, links, informationRequests, informationRequestsProcedureId, busy, disabled,
  onLocalCaseChange, onRemoteCaseChange, onProcedureChange, onLoadDetail, onLoadInformationRequests, onLink, onUnlink,
}: {
  cases: CaseRecord[];
  overview: GremiaBrDashboardOverview;
  localCaseId: string;
  remoteCaseId: string;
  procedureId: string;
  detail: GremiaBrProcedureDetail | null;
  links: GremiaBrExternalReferenceRecord[];
  informationRequests: GremiaBrInformationRequest[];
  informationRequestsProcedureId: string;
  busy: boolean;
  disabled: boolean;
  onLocalCaseChange: (id: string) => void;
  onRemoteCaseChange: (id: string) => void;
  onProcedureChange: (id: string) => void;
  onLoadDetail: () => void;
  onLoadInformationRequests: () => void;
  onLink: () => void;
  onUnlink: (id: string) => void;
}) {
  const remoteCase = overview.accessibleCases.find((item) => item.id === remoteCaseId);
  const availableProcedures = remoteCase?.procedureIds ?? [];
  const validDetail = detail?.id === procedureId && detail.masterCaseId === remoteCaseId ? detail : null;
  const procedureLinks = links.filter((link) => link.sourceType === 'verfahren');
  const alreadyLinked = procedureLinks.some((link) => link.sourceId === procedureId);
  const canInteract = !disabled && !busy;

  return (
    <IndustrialPanel kicker="Fallbezug" title="Verknüpfte Gremia.BR-Verfahren">
      <div className="industrial-form-grid two-columns">
        <SearchableSelectInput label="Lokale Fallakte" value={localCaseId} options={caseOptions(cases)} onValueChange={onLocalCaseChange} disabled={!canInteract} placeholder="Fallakte suchen …" required />
        <SearchableSelectInput
          label="Gremia.BR-Sachverhalt"
          value={remoteCaseId}
          options={overview.accessibleCases.filter((item) => item.procedureIds.length > 0).map((item) => ({ value: item.id, label: `${item.reference} · ${item.subject}` }))}
          onValueChange={onRemoteCaseChange}
          disabled={!canInteract || !overview.lastFetchedAt}
          placeholder="Kennzeichen oder Betreff suchen …"
          required
        />
        {remoteCase ? (
          <SelectInput
            label="Verfahren im Sachverhalt"
            value={procedureId}
            options={[{ value: '', label: 'Verfahren auswählen …' }, ...availableProcedures.map((id, index) => ({ value: id, label: `Verfahren ${index + 1} von ${availableProcedures.length}` }))]}
            onValueChange={onProcedureChange}
            disabled={!canInteract}
            required
          />
        ) : null}
      </div>
      {procedureId ? (
        <div className="industrial-action-row">
          <ToolbarButton disabled={!canInteract} onClick={onLoadDetail}>Verfahrensdetails laden</ToolbarButton>
        </div>
      ) : null}
      {validDetail ? (
        <>
          <dl className="industrial-meta-grid">
            <div><dt>Verfahrensart</dt><dd>{procedureTypeLabel(validDetail.procedureType)}</dd></div>
            <div><dt>Status</dt><dd>{STATE_LABELS[validDetail.state] ?? 'Status nicht zugeordnet'}</dd></div>
            <div><dt>Eröffnet</dt><dd><time dateTime={validDetail.openedAt}>{new Date(validDetail.openedAt).toLocaleDateString('de-DE')}</time></dd></div>
          </dl>
          <div className="industrial-action-row">
            <IndustrialButton disabled={!canInteract || !localCaseId || alreadyLinked} onClick={onLink}>
              {alreadyLinked ? 'Bereits verknüpft' : 'Mit Fallakte verknüpfen'}
            </IndustrialButton>
          </div>
        </>
      ) : null}
      {validDetail && alreadyLinked ? (
        <div className="industrial-action-row">
          <ToolbarButton disabled={!canInteract} onClick={onLoadInformationRequests}>Informationsanforderungen laden</ToolbarButton>
        </div>
      ) : null}
      {alreadyLinked && informationRequestsProcedureId === procedureId ? (
        <DataTable
          ariaLabel="Informationsanforderungen des verknüpften Verfahrens"
          headers={['Anforderung', 'Status', 'Angefordert', 'Antwort fällig']}
          rows={informationRequests.map((request, index) => ({
            id: request.id,
            cells: [
              `Informationsanforderung ${index + 1}`,
              REQUEST_STATUS_LABELS[request.status],
              new Date(request.requestedAt).toLocaleDateString('de-DE'),
              request.responseDueAt ? new Date(request.responseDueAt).toLocaleDateString('de-DE') : 'Keine Frist',
            ],
          }))}
          empty={<EmptyState title="Keine Informationsanforderungen" text="Für dieses Verfahren sind derzeit keine Anforderungen vorhanden." />}
        />
      ) : null}
      {localCaseId ? (
        <DataTable
          ariaLabel="Verknüpfte Gremia.BR-Verfahren der Fallakte"
          headers={['Sachverhalt', 'Aktion']}
          rows={procedureLinks.map((link) => ({
            id: link.id,
            cells: [link.title, <ToolbarButton key={link.id} disabled={!canInteract} onClick={() => onUnlink(link.id)} aria-label={`Verknüpfung zu ${link.title} aufheben`}>Verknüpfung aufheben</ToolbarButton>],
          }))}
          empty={<EmptyState title="Keine Verknüpfung" text="Für diese Fallakte ist noch kein Gremia.BR-Verfahren verknüpft." />}
        />
      ) : null}
    </IndustrialPanel>
  );
}
