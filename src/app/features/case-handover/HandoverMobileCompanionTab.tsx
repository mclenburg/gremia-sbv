import { useMemo, useState, type FormEvent } from 'react';
import { MobilePairingExchangePanel } from './MobilePairingExchangePanel';
import { Plus, Smartphone } from 'lucide-react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseMeasureRecord } from '../../../domain/models/case-measure.model';
import type { MobileCompanionDevice, MobileCompanionPairingRequestResult, MobileCompanionSnapshotResult } from '../../../domain/models/mobile-companion.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormActions, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { CaseHandoverCasePicker } from './CaseHandoverCasePicker';
import { MobileSnapshotResultPanel } from './MobileSnapshotResultPanel';
import { activeMobileWorkCases } from './caseHandoverCockpitPolicy';
import { useMobileCompanionWorkflow, type MobileDeviceDraft } from './useMobileCompanionWorkflow';

export { MobileSnapshotResultPanel } from './MobileSnapshotResultPanel';

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
  pairingRequest,
  busy,
  open,
  onDraftChange,
  onSubmit,
  onDisable,
  onOpen,
  onClose,
}: {
  devices: MobileCompanionDevice[];
  draft: MobileDeviceDraft;
  pairingRequest: MobileCompanionPairingRequestResult | null;
  busy: boolean;
  open: boolean;
  onDraftChange: (draft: MobileDeviceDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDisable: (id: string) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  return <IndustrialPanel
    ariaLabel="Mobile Begleit-App koppeln"
    kicker="Begleit-App"
    title="Gekoppelte Mobilgeräte"
    actions={<IndustrialButton onClick={onOpen}><Plus className="industrial-icon" aria-hidden="true" /> Mobilgerät koppeln</IndustrialButton>}
    helpId="caseHandover.mobile"
  >
    <MobileDeviceTable devices={devices} busy={busy} onDisable={onDisable} />
    {open ? <IndustrialModal
      title="Mobilgerät koppeln"
      kicker="Neue mobile Arbeitsstation"
    description="Die Desktop-Anfrage wird in der Begleit-App beantwortet. Gekoppelt wird erst nach übereinstimmendem Sicherheitscode."
      icon={<Smartphone className="industrial-icon-md" />}
      onClose={busy ? undefined : onClose}
      closeOnEscape={!busy}
      wide
      actions={<>
        <ToolbarButton onClick={onClose} disabled={busy}>Abbrechen</ToolbarButton>
        <IndustrialButton type="submit" form="mobile-device-pairing-form" loading={busy} disabled={!draft.label.trim() || !draft.pairingResponse.trim() || !draft.securityCode.trim()}>
          Mobilgerät koppeln
        </IndustrialButton>
      </>}
    >
      <form id="mobile-device-pairing-form" className="industrial-modal-form" onSubmit={onSubmit}>
        {pairingRequest ? <MobilePairingExchangePanel request={pairingRequest.pairingRequest} disabled={busy}
          onResponse={(pairingResponse) => onDraftChange({ ...draft, pairingResponse })} /> : null}
        <div className="industrial-form-grid industrial-form-grid-2">
          <TextInput label="Gerätename" value={draft.label} onValueChange={(label) => onDraftChange({ ...draft, label })} placeholder="z. B. Diensthandy SBV" required />
          <TextareaInput label="Desktop-Pairinganfrage" value={pairingRequest?.pairingRequest ?? ''} onValueChange={() => undefined} rows={3} readOnly wide />
          <TextareaInput label="Pairingantwort der App" value={draft.pairingResponse} onValueChange={(pairingResponse) => onDraftChange({ ...draft, pairingResponse })} rows={3} required wide />
          <TextInput label="Sicherheitscode" value={draft.securityCode} onValueChange={(securityCode) => onDraftChange({ ...draft, securityCode })} placeholder="AAAA-BBBB-CCCC" required />
        </div>
      </form>
    </IndustrialModal> : null}
  </IndustrialPanel>;
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
  onCopyFrame,
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
  onCopyFrame: (frame: string) => void;
}) {
  return <IndustrialPanel
    ariaLabel="Mobile Projektion erstellen"
    kicker="Ausgabe"
    title="Mobile Arbeitsprojektion erstellen"
    helpId="caseHandover.mobile"
  >
    <form className="industrial-stack" onSubmit={onSubmit}>
      <CaseHandoverCasePicker cases={cases} selectedIds={caseIds} onChange={onCaseIdsChange} legend="Fallakten für die mobile Arbeit" />
      <SelectInput label="Zielgerät" value={selectedDeviceId} onValueChange={onDeviceChange} options={deviceOptions} required />
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {message ? <div className="industrial-message industrial-message-ok" role="status">{message}</div> : null}
      {snapshot ? <MobileSnapshotResultPanel snapshot={snapshot} onCopyFrame={onCopyFrame} /> : null}
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
  pairingRequest,
  pairingOpen,
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
  onOpenPairing,
  onClosePairing,
  onCaseIdsChange,
  onDeviceChange,
  onCreateSnapshot,
  onCopyFrame,
}: {
  cases: CaseRecord[];
  devices: MobileCompanionDevice[];
  deviceDraft: MobileDeviceDraft;
  pairingRequest: MobileCompanionPairingRequestResult | null;
  pairingOpen: boolean;
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
  onOpenPairing: () => void;
  onClosePairing: () => void;
  onCaseIdsChange: (ids: string[]) => void;
  onDeviceChange: (id: string) => void;
  onCreateSnapshot: (event: FormEvent<HTMLFormElement>) => void;
  onCopyFrame: (frame: string) => void;
}) {
  return <div className="industrial-stack">
    <MobileDevicePairingPanel
      devices={devices}
      draft={deviceDraft}
      pairingRequest={pairingRequest}
      busy={busy}
      open={pairingOpen}
      onDraftChange={onDraftChange}
      onSubmit={onSaveDevice}
      onDisable={onDisableDevice}
      onOpen={onOpenPairing}
      onClose={onClosePairing}
    />
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
      onCopyFrame={onCopyFrame}
    />
  </div>;
}

export function HandoverMobileCompanionTab({ cases, measures = [] }: { cases: CaseRecord[]; measures?: CaseMeasureRecord[] }) {
  const [pairingOpen, setPairingOpen] = useState(false);
  const mobileCases = useMemo(() => activeMobileWorkCases(cases, measures), [cases, measures]);
  const workflow = useMobileCompanionWorkflow(mobileCases);

  return <MobileCompanionPanels
    cases={mobileCases}
    devices={workflow.devices}
    deviceDraft={workflow.deviceDraft}
    pairingRequest={workflow.pairingRequest}
    pairingOpen={pairingOpen}
    caseIds={workflow.caseIds}
    deviceOptions={workflow.deviceOptions}
    selectedDeviceId={workflow.selectedDeviceId}
    busy={workflow.busy}
    error={workflow.error}
    message={workflow.message}
    snapshot={workflow.snapshot}
    onDraftChange={workflow.setDeviceDraft}
    onSaveDevice={(event) => void workflow.saveDevice(event).then((saved) => { if (saved) setPairingOpen(false); })}
    onDisableDevice={(id) => void workflow.disableDevice(id)}
    onOpenPairing={() => void workflow.beginPairing().then((started) => { if (started) setPairingOpen(true); })}
    onClosePairing={() => { workflow.cancelPairing(); setPairingOpen(false); }}
    onCaseIdsChange={workflow.setCaseIds}
    onDeviceChange={workflow.setSelectedDeviceId}
    onCreateSnapshot={workflow.createSnapshot}
    onCopyFrame={(frame) => void workflow.copyFrame(frame)}
  />;
}
