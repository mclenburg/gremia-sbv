import { useState, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import type { CaseHandoverImportMode, CaseHandoverInspectResult } from '../../../domain/models/case-handover.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { ImportPackageReview } from '../../shared/components/ImportExportFeedback';
import { FormActions, PasswordInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

type InspectedPackage = { filePath: string; fileName: string; inspection: CaseHandoverInspectResult };

function formatDate(value?: string): string {
  if (!value) return 'ohne Ablaufdatum';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('de-DE') : value;
}

export function HandoverImportPanel({ onCompleted }: { onCompleted: () => Promise<void> }) {
  const announce = useAnnouncer();
  const [passphrase, setPassphrase] = useState('');
  const [selection, setSelection] = useState<InspectedPackage | null>(null);
  const [mode, setMode] = useState<CaseHandoverImportMode>('create_new');
  const [targetCaseId, setTargetCaseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  function showError(message: string) {
    setError(message);
    announce(message, 'assertive');
  }

  function showStatus(message: string) {
    setStatus(message);
    announce(message, 'polite');
  }

  async function selectAndInspect() {
    setError(''); setStatus(''); setSelection(null);
    if (!passphrase.trim()) return showError('Bitte zuerst die Transport-Passphrase eingeben.');
    setBusy(true);
    try {
      const handover = await requireCaseHandoverBridge();
      const selected = await handover.selectAndInspect(passphrase);
      if (selected.canceled) return;
      const nextMode = selected.inspection.packageType === 'return_delta' ? 'merge_existing' : selected.inspection.importPlan.defaultMode;
      setSelection(selected); setMode(nextMode);
      setTargetCaseId(nextMode === 'merge_existing' ? selected.inspection.matches[0]?.localCaseId ?? '' : '');
    } catch (cause) { showError(cause instanceof Error ? cause.message : 'Übergabepaket konnte nicht geprüft werden.'); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setStatus('');
    if (!selection) return showError('Bitte zuerst ein Übergabepaket auswählen und prüfen.');
    if (selection.inspection.isExpired) return showError('Das Übergabepaket ist abgelaufen und darf nicht importiert werden.');
    if (mode === 'merge_existing' && selection.inspection.packageType === 'vacation_handover' && !targetCaseId) return showError('Bitte die lokale Zielakte auswählen.');
    setBusy(true);
    try {
      const handover = await requireCaseHandoverBridge();
      await handover.import({ filePath: selection.filePath, passphrase, mode, targetCaseId: targetCaseId || undefined });
      showStatus(selection.inspection.packageType === 'return_delta' ? 'Rückgabe wurde in die ursprünglichen Fallakten eingespielt.' : 'Urlaubsübergabe wurde als lokale Vertretungsakte importiert.');
      setSelection(null); setPassphrase('');
      await onCompleted();
    } catch (cause) { showError(cause instanceof Error ? cause.message : 'Übergabepaket konnte nicht importiert werden.'); }
    finally { setBusy(false); }
  }

  const inspection = selection?.inspection;
  return <IndustrialPanel kicker="Eingang" title="Übergabe oder Rückgabe importieren" description="Das Paket wird vor jeder Schreiboperation geprüft; erst danach ist der Import möglich.">
    <form className="industrial-stack" onSubmit={submit}>
      <PasswordInput label="Transport-Passphrase" value={passphrase} onValueChange={(value) => { setPassphrase(value); setSelection(null); }} required />
      <div className="industrial-action-row"><ToolbarButton type="button" onClick={() => void selectAndInspect()} loading={busy}>Datei auswählen und Paket prüfen</ToolbarButton></div>
      {selection ? <TextInput label="Geprüfte Datei" value={selection.fileName} onValueChange={() => undefined} readOnly /> : null}
      {inspection?.packageType === 'return_delta' ? <div className="industrial-message" role="status"><strong>Rückgabe-Delta geprüft.</strong> Die Zuordnung erfolgt ausschließlich über das auf dieser Instanz protokollierte Ausgangspaket.</div> : null}
      {inspection?.packageType === 'vacation_handover' ? <ImportPackageReview
        caseCount={inspection.caseCount} measureCount={inspection.measureCount} documentCount={inspection.documentCount} deadlineCount={inspection.deadlineCount}
        validUntilLabel={formatDate(inspection.expiresAt)} integrityLabel={inspection.integrity?.verified ? `Integrität kryptografisch bestätigt · Format ${inspection.integrity.formatVersion}` : undefined}
        warnings={inspection.warnings} planItems={inspection.importPlan.decisions} mergeAllowed={inspection.importPlan.mergeAllowed}
        matches={inspection.matches.map((match) => ({ id: match.localCaseId, label: `${match.caseNumber} · ${match.displayName}`, reasonLabel: match.conflictLevel === 'true_conflict' ? 'Echter Konflikt' : match.confidence === 'high' ? 'Sicherer Treffer' : 'Möglicher Treffer' }))}
        mode={mode} targetId={targetCaseId} onModeChange={setMode} onTargetChange={setTargetCaseId}
      /> : null}
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {status ? <div className="industrial-message industrial-message-success" role="status">{status}</div> : null}
      <FormActions><IndustrialButton type="submit" loading={busy} disabled={!selection}><Upload className="h-4 w-4" aria-hidden="true" />Geprüftes Paket importieren</IndustrialButton></FormActions>
    </form>
  </IndustrialPanel>;
}
