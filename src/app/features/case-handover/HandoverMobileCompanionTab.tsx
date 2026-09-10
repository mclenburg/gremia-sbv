import type { FormEvent } from 'react';
import { Copy, Smartphone } from 'lucide-react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { MobileCompanionDevice, MobileCompanionSnapshotResult } from '../../../domain/models/mobile-companion.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormActions, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { CaseHandoverCasePicker } from './CaseHandoverCasePicker';
import { useMobileCompanionWorkflow, type MobileDeviceDraft } from './useMobileCompanionWorkflow';

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('de-DE');
}

function MobileDeviceTable({
  devices,
  busy,
  onDisable,
}: {
  devices: MobileCompanionDevice[];
  busy: boolean;
  onDisable: (id: string) => void;
}) {
  return <div className="industrial-table-shell">
    <table className="industrial-table">
      <thead><tr><th>Gerät</th><th>Instanz</th><th>Letzter Snapshot</th><th>Aktion</th></tr></thead>
      <tbody>
        {devices.map((device) => (
          <tr key={device.id}>
            <td>{device.label}</td>
            <td>{device.instanceId}</td>
            <td>{formatDateTime(device.lastSnapshotAt)}</td>
            <td className="industrial-table-actions">
              {device.status === 'active'
                ? <ToolbarButton disabled={busy} onClick={() => onDisable(device.id)}>Deaktivieren</ToolbarButton>
                : 'deaktiviert'}
            </td>
          </tr>
        ))}
        {!devices.length ? <tr><td colSpan={4}>Noch kein Mobilgerät gekoppelt.</td></tr> : null}
      </tbody>
    </table>
  </div>;
}

function MobileDevicePairingPanel({
  devices,
  draft,
  busy,
  onDraftChange,
  onSubmit,
  onDisable,
}: {
  devices: MobileCompanionDevice[];
  draft: MobileDeviceDraft;
  busy: boolean;
  onDraftChange: (draft: MobileDeviceDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDisable: (id: string) => void;
}) {
  return <IndustrialPanel
    ariaLabel="Mobile Begleit-App koppeln"
    kicker="Begleit-App"
    title="Mobilgerät koppeln"
    description="Die App liefert ihre öffentliche Empfängerkennung. Private Schlüssel bleiben auf dem jeweiligen Gerät."
    helpId="caseHandover.mobile"
  >
    <form className="industrial-stack" onSubmit={onSubmit}>
      <div className="industrial-form-grid industrial-form-grid-2">
        <TextInput label="Gerätename" value={draft.label} onValueChange={(label) => onDraftChange({ ...draft, label })} placeholder="z. B. Diensthandy SBV" required />
        <TextareaInput label="Empfängerkennung der App" value={draft.recipientToken} onValueChange={(recipientToken) => onDraftChange({ ...draft, recipientToken })} rows={3} required />
      </div>
      <FormActions>
        <IndustrialButton type="submit" loading={busy} disabled={!draft.label.trim() || !draft.recipientToken.trim()}>
          <Smartphone className="industrial-icon" aria-hidden="true" /> Mobilgerät koppeln
        </IndustrialButton>
      </FormActions>
    </form>
    <MobileDeviceTable devices={devices} busy={busy} onDisable={onDisable} />
  </IndustrialPanel>;
}

function MobileSnapshotResultPanel({
  snapshot,
  onCopyFirstFrame,
}: {
  snapshot: MobileCompanionSnapshotResult;
  onCopyFirstFrame: () => void;
}) {
  return <div className="industrial-stack" aria-live="polite">
    <dl className="industrial-meta-grid">
      <dt>Fallakten</dt><dd>{snapshot.caseCount}</dd>
      <dt>Fristen</dt><dd>{snapshot.deadlineCount}</dd>
      <dt>QR-Frames</dt><dd>{snapshot.qrFrames.length}</dd>
      <dt>Zielinstanz</dt><dd>{snapshot.targetInstanceId}</dd>
    </dl>
    <TextareaInput label="Erster Mobile-Frame" value={snapshot.qrFrames[0] ?? ''} onValueChange={() => undefined} rows={4} readOnly wide />
    <FormActions>
      <IndustrialButton variant="secondary" onClick={onCopyFirstFrame}>
        <Copy className="industrial-icon" aria-hidden="true" /> Ersten Frame kopieren
      </IndustrialButton>
    </FormActions>
  </div>;
}

function MobileSnapshotPanel({
  cases,
  caseIds,
  deviceOptions,
  selectedDeviceId,
  busy,
  error,
  message,
  snapshot,
  onCaseIdsChange,
  onDeviceChange,
  onSubmit,
  onCopyFirstFrame,
}: {
  cases: CaseRecord[];
  caseIds: string[];
  deviceOptions: Array<{ value: string; label: string }>;
  selectedDeviceId: string;
  busy: boolean;
  error: string;
  message: string;
  snapshot: MobileCompanionSnapshotResult | null;
  onCaseIdsChange: (ids: string[]) => void;
  onDeviceChange: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCopyFirstFrame: () => void;
}) {
  return <IndustrialPanel
    ariaLabel="Mobile Projektion erstellen"
    kicker="Ausgabe"
    title="Mobile Arbeitsprojektion erstellen"
    description="Übertragen werden nur Fallkopf, Status und offene Fristen. Notizen, Dokumente und Freitexte bleiben im Desktop-Tresor."
    helpId="caseHandover.mobile"
  >
    <form className="industrial-stack" onSubmit={onSubmit}>
      <CaseHandoverCasePicker cases={cases} selectedIds={caseIds} onChange={onCaseIdsChange} legend="Fallakten für die mobile Arbeit" />
      <SelectInput label="Zielgerät" value={selectedDeviceId} onValueChange={onDeviceChange} options={deviceOptions} required />
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {message ? <div className="industrial-message industrial-message-ok" role="status">{message}</div> : null}
      {snapshot ? <MobileSnapshotResultPanel snapshot={snapshot} onCopyFirstFrame={onCopyFirstFrame} /> : null}
      <FormActions>
        <IndustrialButton type="submit" loading={busy} disabled={!selectedDeviceId || !caseIds.length}>
          Mobile-Projektion erzeugen
        </IndustrialButton>
      </FormActions>
    </form>
  </IndustrialPanel>;
}

function MobileCompanionPanels({
  cases,
  devices,
  deviceDraft,
  caseIds,
  deviceOptions,
  selectedDeviceId,
  busy,
  error,
  message,
  snapshot,
  onDraftChange,
  onSaveDevice,
  onDisableDevice,
  onCaseIdsChange,
  onDeviceChange,
  onCreateSnapshot,
  onCopyFirstFrame,
}: {
  cases: CaseRecord[];
  devices: MobileCompanionDevice[];
  deviceDraft: MobileDeviceDraft;
  caseIds: string[];
  deviceOptions: Array<{ value: string; label: string }>;
  selectedDeviceId: string;
  busy: boolean;
  error: string;
  message: string;
  snapshot: MobileCompanionSnapshotResult | null;
  onDraftChange: (draft: MobileDeviceDraft) => void;
  onSaveDevice: (event: FormEvent<HTMLFormElement>) => void;
  onDisableDevice: (id: string) => void;
  onCaseIdsChange: (ids: string[]) => void;
  onDeviceChange: (id: string) => void;
  onCreateSnapshot: (event: FormEvent<HTMLFormElement>) => void;
  onCopyFirstFrame: () => void;
}) {
  return <div className="industrial-stack">
    <MobileDevicePairingPanel devices={devices} draft={deviceDraft} busy={busy} onDraftChange={onDraftChange} onSubmit={onSaveDevice} onDisable={onDisableDevice} />
    <MobileSnapshotPanel
      cases={cases}
      caseIds={caseIds}
      deviceOptions={deviceOptions}
      selectedDeviceId={selectedDeviceId}
      busy={busy}
      error={error}
      message={message}
      snapshot={snapshot}
      onCaseIdsChange={onCaseIdsChange}
      onDeviceChange={onDeviceChange}
      onSubmit={onCreateSnapshot}
      onCopyFirstFrame={onCopyFirstFrame}
    />
  </div>;
}

export function HandoverMobileCompanionTab({ cases }: { cases: CaseRecord[] }) {
  const workflow = useMobileCompanionWorkflow(cases);

  return <MobileCompanionPanels
    cases={cases}
    devices={workflow.devices}
    deviceDraft={workflow.deviceDraft}
    caseIds={workflow.caseIds}
    deviceOptions={workflow.deviceOptions}
    selectedDeviceId={workflow.selectedDeviceId}
    busy={workflow.busy}
    error={workflow.error}
    message={workflow.message}
    snapshot={workflow.snapshot}
    onDraftChange={workflow.setDeviceDraft}
    onSaveDevice={workflow.saveDevice}
    onDisableDevice={(id) => void workflow.disableDevice(id)}
    onCaseIdsChange={workflow.setCaseIds}
    onDeviceChange={workflow.setSelectedDeviceId}
    onCreateSnapshot={workflow.createSnapshot}
    onCopyFirstFrame={() => void workflow.copyFirstFrame()}
  />;
}
