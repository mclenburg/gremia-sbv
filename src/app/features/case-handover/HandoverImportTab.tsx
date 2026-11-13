import { useState } from 'react';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { HandoverImportPanel } from './HandoverImportPanel';
import { VacationV5ReturnImportPanel } from './VacationV5ReturnImportPanel';
import { VacationV5ImportPanel } from './VacationV5ImportPanel';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

export type SelectedHandoverFile = { token: string; name: string };
type Selection = SelectedHandoverFile & { kind: 'legacy' | 'vacation_v5' | 'return_v5'; formatVersion: number };

export function HandoverImportTab({ onCompleted }: { onCompleted: () => Promise<void> }) {
  const announce = useAnnouncer();
  const [selected, setSelected] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function chooseFile() {
    setBusy(true); setError(''); setStatus('');
    try {
      const bridge = await requireCaseHandoverBridge();
      const file = await bridge.selectFile();
      if (file.canceled) { setStatus('Dateiauswahl abgebrochen.'); return; }
      const route = await bridge.classifyFile(file.filePath);
      setSelected({ token: file.filePath, name: file.fileName, ...route });
      announce(`Format ${route.formatVersion} erkannt. Bitte das Paket mit seiner Passphrase prüfen.`, 'polite');
    } catch (cause) {
      setSelected(null);
      const message = cause instanceof Error ? cause.message : 'Übergabedatei konnte nicht zugeordnet werden.';
      setError(message); announce(message, 'assertive');
    } finally { setBusy(false); }
  }

  async function complete() {
    setSelected(null); setStatus('Paket wurde übernommen.');
    try { await onCompleted(); }
    catch {
      const message = 'Das Paket wurde übernommen. Die Übersicht konnte nicht aktualisiert werden; bitte den Bereich erneut öffnen.';
      setError(message); announce(message, 'assertive');
    }
  }

  return <IndustrialPanel kicker="Eingang" title="Übergabe oder Rückgabe importieren"
    description="Datei auswählen; Gremia.SBV erkennt das Paketformat und zeigt nur dessen Prüf- und Importablauf."
    ariaLabel="Übergabepaket auswählen und importieren" helpId="caseHandover.import">
    <div className="industrial-stack">
      <div className="industrial-action-row"><ToolbarButton type="button" loading={busy}
        onClick={() => void chooseFile()}>Übergabedatei auswählen</ToolbarButton></div>
      {selected ? <>
        <TextInput label="Ausgewählte Datei" value={selected.name} onValueChange={() => undefined} readOnly />
        <p role="status">Format {selected.formatVersion} erkannt. Die endgültige Prüfung erfolgt nach Eingabe der Passphrase.</p>
        {selected.kind === 'legacy' ? <HandoverImportPanel key={selected.token} file={selected} onCompleted={complete} /> : null}
        {selected.kind === 'vacation_v5' ? <VacationV5ImportPanel key={selected.token} file={selected} onCompleted={complete} /> : null}
        {selected.kind === 'return_v5' ? <VacationV5ReturnImportPanel key={selected.token} file={selected} onCompleted={complete} /> : null}
      </> : null}
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {status ? <div className="industrial-message industrial-message-success" role="status">{status}</div> : null}
    </div>
  </IndustrialPanel>;
}
