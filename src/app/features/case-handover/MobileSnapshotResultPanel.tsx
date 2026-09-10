import { QRCodeSVG } from 'qrcode.react';
import { Copy } from 'lucide-react';
import type { MobileCompanionSnapshotResult } from '../../../domain/models/mobile-companion.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormActions, SelectInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { MOBILE_QR_PLAYBACK_SPEED_OPTIONS, type MobileQrPlaybackSpeed } from './mobileQrPlaybackPolicy';
import { useMobileQrPlayback } from './useMobileQrPlayback';

function clampFrameIndex(value: number, frameCount: number): number {
  return Math.min(Math.max(value, 0), Math.max(frameCount - 1, 0));
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function QrPlaybackControls({
  frameCount,
  playback,
}: {
  frameCount: number;
  playback: ReturnType<typeof useMobileQrPlayback>;
}) {
  return <div className="handover-mobile-frame-controls" aria-label="Mobile-Frames steuern">
    <ToolbarButton type="button" onClick={playback.toggleRunning} disabled={playback.aborted || playback.expired || frameCount <= 1}>
      {playback.running ? 'Automatik pausieren' : 'Automatik starten'}
    </ToolbarButton>
    <ToolbarButton type="button" disabled={playback.frameIndex === 0 || playback.aborted} onClick={() => playback.setFrameIndex((current) => clampFrameIndex(current - 1, frameCount))}>
      Vorheriger Frame
    </ToolbarButton>
    <ToolbarButton type="button" disabled={playback.frameIndex >= frameCount - 1 || playback.aborted} onClick={() => playback.setFrameIndex((current) => clampFrameIndex(current + 1, frameCount))}>
      Nächster Frame
    </ToolbarButton>
    <ToolbarButton type="button" onClick={playback.abort} disabled={playback.aborted || playback.expired}>
      Übertragung abbrechen
    </ToolbarButton>
    {playback.aborted || playback.expired ? <ToolbarButton type="button" onClick={playback.restart}>Übertragung neu starten</ToolbarButton> : null}
  </div>;
}

export function MobileSnapshotResultPanel({
  snapshot,
  onCopyFrame,
}: {
  snapshot: MobileCompanionSnapshotResult;
  onCopyFrame: (frame: string) => void;
}) {
  const frameCount = snapshot.qrFrames.length;
  const playback = useMobileQrPlayback(snapshot.packageId, frameCount);
  const currentFrame = snapshot.qrFrames[playback.frameIndex] ?? snapshot.qrFrames[0] ?? '';
  const transferUnavailable = playback.aborted || playback.expired;

  return <div className="industrial-stack" aria-live="polite">
    <dl className="industrial-meta-grid">
      <dt>Fallakten</dt><dd>{snapshot.caseCount}</dd>
      <dt>Fristen</dt><dd>{snapshot.deadlineCount}</dd>
      <dt>QR-Frames</dt><dd>{frameCount}</dd>
      <dt>Zielinstanz</dt><dd>{snapshot.targetInstanceId}</dd>
    </dl>
    <div className="handover-mobile-qr-shell">
      <figure className="handover-mobile-qr-card">
        {transferUnavailable ? <div className="handover-mobile-qr-paused" role="status">
          {playback.aborted ? 'Übertragung abgebrochen' : 'Zeitfenster abgelaufen'}
        </div> : <QRCodeSVG
          value={currentFrame}
          size={336}
          marginSize={3}
          level="M"
          bgColor="var(--industrial-qr-bg)"
          fgColor="var(--industrial-qr-fg)"
          title={`Mobile-Frame ${playback.frameIndex + 1} von ${frameCount}`}
        />}
        <figcaption>Frame {playback.frameIndex + 1} von {frameCount}</figcaption>
      </figure>
      <div className="industrial-stack">
        <p className="industrial-meta">
          In der Begleit-App „Snapshot scannen“ öffnen. Gremia.SBV wechselt die Frames automatisch;
          bei älteren Kameras ist „Kompatibel“ die sicherste Einstellung.
        </p>
        <div className="industrial-form-grid industrial-form-grid-2">
          <SelectInput
            label="Tempo"
            value={playback.speed}
            onValueChange={(speed) => playback.setSpeed(speed as MobileQrPlaybackSpeed)}
            options={MOBILE_QR_PLAYBACK_SPEED_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
          <div className="handover-mobile-countdown" role="status">
            Zeitfenster: {formatCountdown(playback.secondsLeft)}
          </div>
        </div>
        <QrPlaybackControls frameCount={frameCount} playback={playback} />
        <TextareaInput label="Aktueller Mobile-Frame" value={currentFrame} onValueChange={() => undefined} rows={4} readOnly wide />
      </div>
    </div>
    <FormActions>
      <IndustrialButton variant="secondary" onClick={() => onCopyFrame(currentFrame)} disabled={transferUnavailable}>
        <Copy className="industrial-icon" aria-hidden="true" /> Aktuellen Frame kopieren
      </IndustrialButton>
    </FormActions>
  </div>;
}
