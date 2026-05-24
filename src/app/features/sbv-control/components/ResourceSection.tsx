import { GraduationCap, Trash2 } from 'lucide-react';
import type { SbvResourceRecordKind, SbvResourceRecordStatus } from '../../../core/models/sbv-resource.model';
import { DangerButton, GhostButton } from '../../../shared/components/IndustrialButton';
import {
  EmptyState,
  IndustrialRecordCard,
  RecordList,
  SearchToolbar,
} from '../../../shared/components/WorkbenchLayout';
import { ProcessStatusBadge } from '../../../shared/components/StatusBadges';
import { formatDate } from '../sbvControlLogic';
import { resourceKindLabels, resourceStatusLabels } from '../sbvControlTypes';
import type { UseSbvResourcesValue } from '../hooks/useSbvResources';
import { ResourceForm } from './ResourceForm';
import { SbvControlPanel } from './SbvControlPanel';

export function ResourceSection({
  state,
  onOperationResult,
}: {
  state: UseSbvResourcesValue;
  onOperationResult: (result: { ok: boolean; message: string }) => void;
}) {
  async function saveResource() {
    onOperationResult(await state.saveResource());
  }

  async function deleteResource(id: string) {
    onOperationResult(await state.deleteResource(id));
  }

  return (
    <SbvControlPanel
      icon={<GraduationCap className="h-5 w-5" />}
      kicker="§ 179 SGB IX"
      title="Schulungen, Heranziehungen und Sachmittel protokollieren"
    >
      <div className="sbv-resource-workbench">
        <ResourceForm state={state} onSubmit={() => void saveResource()} />
        <div className="sbv-resource-list" aria-label="SBV-Nachweise">
          <SearchToolbar
            searchValue={state.resourceQuery}
            onSearchChange={state.setResourceQuery}
            searchLabel="Nachweise durchsuchen"
            searchPlaceholder="Titel, Rechtsgrundlage, Anbieter …"
            resultCount={state.visibleResources.length}
          />
          <RecordList
            items={state.visibleResources}
            getKey={(record) => record.id}
            ariaLabel="Gefilterte SBV-Nachweise"
            empty={
              <EmptyState
                title={state.resources.length === 0 ? 'Noch keine Nachweise' : 'Keine Treffer'}
                text={
                  state.resources.length === 0
                    ? 'Erfasse Schulungen, Heranziehungen oder Sachmittel hier, damit später nachvollziehbar ist, was beantragt, durchgeführt oder abgelehnt wurde.'
                    : 'Zur Suche passen keine Nachweise. Suchbegriff anpassen oder Suche leeren.'
                }
              />
            }
            renderItem={(record) => (
              <IndustrialRecordCard className="sbv-resource-record">
                <GhostButton className="sbv-resource-record-main" onClick={() => state.editResource(record)}>
                  <strong>{record.title}</strong>
                  <span>
                    {resourceKindLabels[record.kind as SbvResourceRecordKind] ?? record.kind} · {formatDate(record.startedAt)}
                    <ProcessStatusBadge
                      status={record.status}
                      label={resourceStatusLabels[record.status as SbvResourceRecordStatus] ?? record.status}
                    />
                  </span>
                  <em>{record.legalBasis}</em>
                </GhostButton>
                <DangerButton
                  compact
                  aria-label={`Nachweis ${record.title} löschen`}
                  onClick={() => void deleteResource(record.id)}
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
