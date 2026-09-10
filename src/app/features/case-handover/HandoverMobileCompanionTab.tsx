import { useEffect, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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

function nextFrameIndex(current: number, direction: -1 | 1, frameCount: number) {
  return Math.min(Math.max(current + direction, 0), Math.max(frameCount - 1, 0));
}

export function MobileSnapshotResultPanel({
  snapshot,
  onCopyFrame,
}: {
  snapshot: MobileCompanionSnapshotResult;
  onCopyFrame: (frame: string) => void;
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frameCount = snapshot.qrFrames.length;
  const currentFrame = snapshot.qrFrames[frameIndex] ?? snapshot.qrFrames[0] ?? '';

  useEffect(() => { setFrameIndex(0); }, [snapshot.packageId]);

  return <div className="industrial-stack" aria-live="polite">
    <dl className="industrial-meta-grid">
      <dt>Fallakten</dt><dd>{snapshot.caseCount}</dd>
      <dt>Fristen</dt><dd>{snapshot.deadlineCount}</dd>
      <dt>QR-Frames</dt><dd>{frameCount}</dd>
      <dt>Zielinstanz</dt><dd>{snapshot.targetInstanceId}</dd>
    </dl>
    <div className="handover-mobile-qr-shell">
      <figure className="handover-mobile-qr-card">
        <QRCodeSVG
          value={currentFrame}
          size={248}
          marginSize={3}
          level="M"
          bgColor="var(--industrial-qr-bg)"
          fgColor="var(--industrial-qr-fg)"
          title={`Mobile-Frame ${frameIndex + 1} von ${frameCount}`}
        />
        <figcaption>Frame {frameIndex + 1} von {frameCount}</figcaption>
      </figure>
      <div className="industrial-stack">
        <p className="industrial-meta">
          In der Begleit-App „Snapshot scannen“ öffnen und die Frames nacheinander erfassen.
          Jeder Frame ist zielgebunden verschlüsselt und nur für die gewählte Mobilinstanz nutzbar.
        </p>
        <div className="handover-mobile-frame-controls" aria-label="Mobile-Frames durchschalten">
          <ToolbarButton type="button" disabled={frameIndex === 0} onClick={() => setFrameIndex((current) => nextFrameIndex(current, -1, frameCount))}>Vorheriger Frame</ToolbarButton>
          <ToolbarButton type="button" disabled={frameIndex >= frameCount - 1} onClick={() => setFrameIndex((current) => nextFrameIndex(current, 1, frameCount))}>Nächster Frame</ToolbarButton>
        </div>
        <TextareaInput label="Aktueller Mobile-Frame" value={currentFrame} onValueChange={() => undefined} rows={4} readOnly wide />
      </div>
    </div>
    <FormActions>
      <IndustrialButton variant="secondary" onClick={() => onCopyFrame(currentFrame)}>
        <Copy className="industrial-icon" aria-hidden="true" /> Aktuellen Frame kopieren
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
    description="Übertragen werden nur Fallkopf, Status und offene Fristen. Notizen, Dokumente und Freitexte bleiben im Desktop-Tresor."
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
  onCopyFrame,
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
  onCopyFrame: (frame: string) => void;
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
      onCopyFrame={onCopyFrame}
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
    onCopyFrame={(frame) => void workflow.copyFrame(frame)}
  />;
}
