import { ClipboardList, Trash2 } from 'lucide-react';
import { DangerButton, GhostButton } from '../../../shared/components/IndustrialButton';
import { EmptyState, IndustrialRecordCard, RecordList, SearchToolbar } from '../../../shared/components/WorkbenchLayout';
import { ProcessStatusBadge } from '../../../shared/components/StatusBadges';
import { formatDate } from '../sbvControlLogic';
import { protocolPartnerLabels, protocolStatusLabels, protocolTopicLabels } from '../sbvControlTypes';
import type { UseSbvControlProtocolsValue } from '../hooks/useSbvControlProtocols';
import { ProtocolForm } from './ProtocolForm';
import { SbvControlPanel } from './SbvControlPanel';

export function ProtocolSection({
  state,
  onOperationResult,
}: {
  state: UseSbvControlProtocolsValue;
  onOperationResult: (result: { ok: boolean; message: string }) => void;
}) {
  async function saveProtocol() {
    onOperationResult(await state.saveProtocol());
  }

  async function deleteProtocol(id: string) {
    onOperationResult(await state.deleteProtocol(id));
  }

  return (
    <SbvControlPanel
      icon={<ClipboardList className="h-5 w-5" />}
      kicker="§ 178 Abs. 1 SGB IX"
      title="Übergreifende Protokolle ohne Fallzuordnung"
    >
      <div className="sbv-resource-workbench">
        <ProtocolForm state={state} onSubmit={() => void saveProtocol()} />
        <div className="sbv-resource-list" aria-label="SBV-Steuerungsprotokolle">
          <SearchToolbar
            searchValue={state.protocolQuery}
            onSearchChange={state.setProtocolQuery}
            searchLabel="Protokolle durchsuchen"
            searchPlaceholder="Regelung, Arbeitgeber, BR, Thema …"
            resultCount={state.visibleProtocols.length}
          />
          <RecordList
            items={state.visibleProtocols}
            getKey={(record) => record.id}
            ariaLabel="Gefilterte SBV-Steuerungsprotokolle"
            empty={
              <EmptyState
                title={state.protocols.length === 0 ? 'Noch keine Steuerungsprotokolle' : 'Keine Treffer'}
                text={
                  state.protocols.length === 0
                    ? 'Erfasse hier Gespräche mit Arbeitgeber oder Betriebsrat zu übergreifenden Themen, die bewusst keiner Fallakte zugeordnet werden.'
                    : 'Zur Suche passen keine Protokolle. Suchbegriff anpassen oder Suche leeren.'
                }
              />
            }
            renderItem={(record) => (
              <IndustrialRecordCard className="sbv-resource-record">
                <GhostButton className="sbv-resource-record-main" onClick={() => state.editProtocol(record)}>
                  <strong>{record.title}</strong>
                  <span>
                    {protocolTopicLabels[record.topic] ?? record.topic} · {protocolPartnerLabels[record.partner] ?? record.partner} · {formatDate(record.meetingAt)}
                    <ProcessStatusBadge
                      status={record.status}
                      label={protocolStatusLabels[record.status] ?? record.status}
                    />
                  </span>
                  <em>{record.legalContext}</em>
                </GhostButton>
                <DangerButton
                  compact
                  aria-label={`Steuerungsprotokoll ${record.title} löschen`}
                  onClick={() => void deleteProtocol(record.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </DangerButton>
              </IndustrialRecordCard>
            )}
          />
        </div>
      </div>
    </SbvControlPanel>
  );
}
