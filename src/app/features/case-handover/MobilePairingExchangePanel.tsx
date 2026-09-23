import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

export function MobilePairingExchangePanel({ request, disabled, onResponse }: {
  request: string;
  disabled: boolean;
  onResponse: (response: string) => void;
}) {
  const announce = useAnnouncer();
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  function report(text: string, politeness: 'polite' | 'assertive' = 'polite') {
    if (!active.current) return;
    setMessage(text);
    announce(text, politeness);
  }

  async function exchange(direction: 'export' | 'import') {
    setBusy(true);
    report('Kopplungsdatei wird verarbeitet …');
    try {
      const bridge = await requireCaseHandoverBridge();
      if (direction === 'export') {
        const saved = await bridge.exportMobilePairingRequest(request);
        report(saved ? 'Öffentliche Kopplungsanfrage gespeichert.' : 'Speichern abgebrochen.');
      } else {
        const response = await bridge.readMobilePairingResponse();
        if (active.current && response !== null) onResponse(response);
        report(response !== null ? 'Pairingantwort übernommen. Bitte den Sicherheitscode vergleichen.' : 'Dateiauswahl abgebrochen.');
      }
    } catch {
      report('Kopplungsdatei konnte nicht verarbeitet werden. Bitte eine gültige .gsbvpair-Datei bzw. ein beschreibbares Ziel wählen.', 'assertive');
    } finally {
      if (active.current) setBusy(false);
    }
  }

  return <div className="industrial-stack">
    <figure className="handover-mobile-qr-card">
      <QRCodeSVG value={request} size={336} marginSize={4} level="M"
        bgColor="var(--industrial-qr-bg)" fgColor="var(--industrial-qr-fg)" title="Kopplungsanfrage für die Begleit-App" />
      <figcaption>Kopplungsanfrage</figcaption>
    </figure>
    <div className="industrial-form-actions">
      <ToolbarButton type="button" disabled={disabled || busy} onClick={() => void exchange('export')}>Anfragedatei speichern</ToolbarButton>
      <ToolbarButton type="button" disabled={disabled || busy} onClick={() => void exchange('import')}>Antwortdatei öffnen</ToolbarButton>
    </div>
    <p className="industrial-meta">{message}</p>
  </div>;
}
