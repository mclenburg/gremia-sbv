import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { VacationV5ReturnExportPreview, VacationV5ReturnExportResult,
  VacationV5ReturnInventory, VacationV5ReturnPackageOption,
  VacationV5ReturnSelection } from '../../../domain/transfer/vacationV5File';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { ExportAction, FileLocationNotice } from '../../shared/components/ImportExportFeedback';
import { DateInput, FormActions, PasswordInput, SearchInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { requireCaseHandoverBridge } from './caseHandoverBridge';
import { toHandoverExpiry } from './caseHandoverCockpitPolicy';

const STATUS: Record<string, string> = { unchanged: 'unverändert', changed: 'geändert', missing: 'lokal nicht mehr vorhanden' };

function VacationV5ReturnInventoryList({ inventory, cancellationReasons, additionKeys, query, itemQuery,
  onCancellation, onAddition, onQuery }: {
  inventory: VacationV5ReturnInventory; cancellationReasons: Record<string, string>;
  additionKeys: readonly string[]; query: string; itemQuery: string;
  onCancellation: (ref: string, reason: string | null) => void;
  onAddition: (key: string) => void; onQuery: (value: string) => void;
}) {
  const normalized = query.trim().toLocaleLowerCase('de-DE');
  const additions = inventory.additions.filter((item) => !normalized
    || item.label.toLocaleLowerCase('de-DE').includes(normalized)).slice(0, 20);
  const normalizedItemQuery = itemQuery.trim().toLocaleLowerCase('de-DE');
  const visibleItems = inventory.items.filter((item) => !normalizedItemQuery
    || `${item.label} ${item.kind}`.toLocaleLowerCase('de-DE').includes(normalizedItemQuery)).slice(0, 20);
  return <div className="industrial-stack">
    <fieldset className="industrial-selection-card"><legend>Vorgänge im Ausgangspaket</legend>
      {inventory.items.length > visibleItems.length ? <p className="industrial-meta" role="status">
        {visibleItems.length} von {inventory.items.length} Ausgangsvorgängen angezeigt.</p> : null}
      {visibleItems.map((item) => <div className="handover-case-picker-row" key={item.ref}>
        <strong>{item.label}</strong><small>{item.kind} · {STATUS[item.status] ?? item.status}</small>
        <label className="industrial-checkbox-row"><input type="checkbox" className="industrial-input"
          checked={Object.hasOwn(cancellationReasons, item.ref)}
          onChange={(event) => onCancellation(item.ref, event.currentTarget.checked ? '' : null)} />
          <span>Stornowunsch als Prüfhinweis aufnehmen</span></label>
        {Object.hasOwn(cancellationReasons, item.ref) ? <TextInput label={`Begründung für ${item.label}`}
          value={cancellationReasons[item.ref]} onValueChange={(value) => onCancellation(item.ref, value)} /> : null}
      </div>)}
    </fieldset>
    {inventory.additions.length ? <fieldset className="industrial-selection-card"><legend>Neue Vorgänge und Dokumente</legend>
      {inventory.additions.length > 5 ? <SearchInput label="Neue Vorgänge filtern" value={query} onValueChange={onQuery} /> : null}
      <p className="industrial-meta" role="status">{additionKeys.length} ausgewählt · {additions.length} Treffer angezeigt.</p>
      {additions.map((item) => <label className="industrial-checkbox-row" key={item.key}>
        <input className="industrial-input" type="checkbox" checked={additionKeys.includes(item.key)}
          onChange={() => onAddition(item.key)} />
        <span>{item.label}</span></label>)}
    </fieldset> : null}
  </div>;
}

function returnSelection(inventory: VacationV5ReturnInventory, cancellationReasons: Record<string, string>,
  additionKeys: readonly string[]): VacationV5ReturnSelection {
  const additionalItems = inventory.additions.filter((item) => additionKeys.includes(item.key))
    .flatMap((item) => item.items);
  return { sourcePackageId: inventory.sourcePackageId,
    cancellationRequests: Object.entries(cancellationReasons).map(([ref, reason]) => ({ ref, reason })),
    additionalItems: [...new Map(additionalItems.map((item) => [`${item.kind}:${item.localId}`, item])).values()] };
}

function VacationV5ReturnPreviewPanel({ preview, confirmed, onConfirm }: {
  preview: VacationV5ReturnExportPreview; confirmed: boolean; onConfirm: (value: boolean) => void;
}) {
  return <div className="industrial-selection-card" role="region" aria-label="Rückgabevorschau">
    <h3>Rückgabevorschau</h3><p>{preview.changes.length} Änderungen · {new Intl.NumberFormat('de-DE').format(preview.documentBytes)} Byte Dokumentinhalt.</p>
    <ul>{preview.changes.map((item) => <li key={item.ref}>{item.label} · {item.kind}
      {item.operation === 'cancel_request' ? ' · Stornowunsch' : ''}</li>)}</ul>
    <label className="industrial-checkbox-row"><input className="industrial-input" type="checkbox"
      checked={confirmed} onChange={(event) => onConfirm(event.currentTarget.checked)} />
      <span>Ich habe jede Änderung und jeden Stornowunsch geprüft.</span></label>
  </div>;
}

function filterPackages(packages: VacationV5ReturnPackageOption[], query: string): VacationV5ReturnPackageOption[] {
  const normalized = query.trim().toLocaleLowerCase('de-DE');
  return packages.filter((item) => !normalized
    || `${item.sourcePackageId} ${item.importedAt}`.toLocaleLowerCase('de-DE').includes(normalized)).slice(0, 20);
}

export function VacationV5ReturnExportPanel({ onCompleted }: { onCompleted: () => Promise<void> }) {
  const announce = useAnnouncer();
  const [packages, setPackages] = useState<VacationV5ReturnPackageOption[]>([]);
  const [inventory, setInventory] = useState<VacationV5ReturnInventory | null>(null);
  const [cancellationReasons, setCancellationReasons] = useState<Record<string, string>>({});
  const [additionKeys, setAdditionKeys] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [packageQuery, setPackageQuery] = useState('');
  const [itemQuery, setItemQuery] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [preview, setPreview] = useState<VacationV5ReturnExportPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<VacationV5ReturnExportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const changedCount = useMemo(() => inventory?.items.filter((item) => item.status === 'changed').length ?? 0, [inventory]);
  const visiblePackages = filterPackages(packages, packageQuery);
  useEffect(() => {
    let active = true;
    void requireCaseHandoverBridge().then((bridge) => bridge.listV5ReturnPackages())
      .then((items) => { if (active) setPackages(items); })
      .catch((cause) => { if (!active) return; const message = cause instanceof Error ? cause.message : 'Rückgabepakete konnten nicht geladen werden.';
        setError(message); announce(message, 'assertive'); });
    return () => { active = false; };
  }, [announce]);

  function report(message: string, failed = false) {
    setError(failed ? message : ''); setStatus(failed ? '' : message);
    announce(message, failed ? 'assertive' : 'polite');
  }
  function invalidate() { setPreview(null); setConfirmed(false); setResult(null); }

  async function choose(sourcePackageId: string) {
    setBusy(true); invalidate(); setInventory(null); setCancellationReasons({}); setAdditionKeys([]);
    try {
      const bridge = await requireCaseHandoverBridge();
      const value = await bridge.reviewV5ReturnExportInventory(sourcePackageId);
      setInventory(value); report(`${value.items.length} Ausgangsvorgänge geprüft. Bitte neue Vorgänge und Stornowünsche auswählen.`);
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Ausgangspaket konnte nicht geprüft werden.', true); }
    finally { setBusy(false); }
  }

  async function makePreview() {
    if (!inventory) return report('Bitte zuerst ein Ausgangspaket auswählen.', true);
    if (Object.values(cancellationReasons).some((reason) => reason.trim().length < 3)) {
      return report('Bitte jeden Stornowunsch mit mindestens drei Zeichen begründen.', true);
    }
    setBusy(true); invalidate();
    try {
      const bridge = await requireCaseHandoverBridge();
      const next = await bridge.previewV5ReturnExport(returnSelection(inventory, cancellationReasons, additionKeys));
      if (!next.changes.length) return report('Seit dem Import wurden keine Rückgabeänderungen ausgewählt.', true);
      setPreview(next); report(`${next.changes.length} Rückgabeänderungen geprüft. Bitte bestätigen.`);
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Rückgabevorschau konnte nicht erstellt werden.', true); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inventory || !preview || !confirmed || !inventory.profileId) return report('Bitte Rückgabevorschau und Zielprofil prüfen.', true);
    const expiresAt = toHandoverExpiry(validUntil);
    if (!expiresAt) return report('Bitte ein gültiges Ablaufdatum für die Rückgabe wählen.', true);
    if (passphrase.trim().length < 10) return report('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.', true);
    setBusy(true); setError(''); setStatus('');
    try {
      const bridge = await requireCaseHandoverBridge();
      const exported = await bridge.exportV5Return({ ...returnSelection(inventory, cancellationReasons, additionKeys),
        profileId: inventory.profileId, expiresAt, passphrase, previewDigest: preview.digest },
      'rueckgabe-format-5.gsbvtransfer');
      if (!exported.exported) return report('Dateiauswahl abgebrochen. Das Ausgangspaket bleibt aktiv.');
      setResult(exported); setPassphrase(''); setConfirmed(false);
      report(`${exported.changeCount} Änderungen verschlüsselt zur Rückgabe gespeichert.`);
      try { await onCompleted(); }
      catch { report('Die Rückgabe wurde gespeichert. Die Übersicht konnte nicht aktualisiert werden.', true); }
      setPackages((current) => current.filter((item) => item.sourcePackageId !== inventory.sourcePackageId));
      setInventory(null); setPreview(null); setCancellationReasons({}); setAdditionKeys([]);
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Rückgabeexport fehlgeschlagen. Bitte Vorschau erneuern.', true); }
    finally { setBusy(false); }
  }

  return <IndustrialPanel kicker="Format 5" title="Erweiterte Vertretung zurückgeben"
    ariaLabel="Format-5-Rückgabe exportieren" helpId="caseHandover.returnDelta">
    <form className="industrial-stack" onSubmit={(event) => void submit(event)}>
      {!packages.length ? <p className="industrial-settings-note">Keine aktive Format-5-Vertretung für eine Rückgabe vorhanden.</p> : null}
      {packages.length > 5 ? <SearchInput label="Vertretungen filtern" value={packageQuery} onValueChange={setPackageQuery} /> : null}
      {packages.length ? <div className="industrial-list" aria-label="Aktive Format-5-Vertretungen">
        <p className="industrial-meta" role="status">{visiblePackages.length} von {packages.length} Vertretungen angezeigt.</p>
        {visiblePackages.map((item) => <div className="handover-case-picker-row" key={item.sourcePackageId}>
          <strong>Vertretung vom {new Date(item.importedAt).toLocaleDateString('de-DE')}</strong><small>{item.itemCount} Vorgänge · gültig bis {item.validUntil ? new Date(item.validUntil).toLocaleDateString('de-DE') : 'ohne Angabe'} · Paket {item.sourcePackageId}</small>
          <ToolbarButton type="button" onClick={() => void choose(item.sourcePackageId)} loading={busy}>
            Für Rückgabe auswählen</ToolbarButton></div>)}
      </div> : null}
      {inventory ? <>
        <p>Zielprofil: {inventory.profileLabel ?? 'nicht aktiv oder unbekannt'}</p>
        <p role="status">{changedCount} geänderte Vorgänge im Ausgangspaket.</p>
        {inventory.items.length > 5 ? <SearchInput label="Ausgangsvorgänge filtern" value={itemQuery} onValueChange={setItemQuery} /> : null}
        <VacationV5ReturnInventoryList inventory={inventory} cancellationReasons={cancellationReasons}
          additionKeys={additionKeys} query={query} itemQuery={itemQuery} onQuery={setQuery}
          onCancellation={(ref, reason) => { setCancellationReasons((current) => {
            const next = { ...current }; if (reason === null) delete next[ref]; else next[ref] = reason;
            return next; }); invalidate(); }}
          onAddition={(key) => { setAdditionKeys((current) => current.includes(key)
            ? current.filter((item) => item !== key) : [...current, key]); invalidate(); }} />
        <div className="industrial-action-row"><ToolbarButton type="button" onClick={() => void makePreview()}
          loading={busy}>Rückgabe prüfen</ToolbarButton></div>
      </> : null}
      {preview ? <VacationV5ReturnPreviewPanel preview={preview} confirmed={confirmed} onConfirm={setConfirmed} /> : null}
      <DateInput label="Rückgabe gültig bis" value={validUntil} onValueChange={setValidUntil} required />
      <PasswordInput label="Transport-Passphrase" value={passphrase} onValueChange={setPassphrase} />
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      {status ? <div className="industrial-message industrial-message-success" role="status">{status}</div> : null}
      {result?.exported ? <FileLocationNotice filePath={result.filePath} label="Format-5-Rückgabe gespeichert" /> : null}
      <FormActions><ExportAction type="submit" loading={busy} disabled={!preview || !confirmed || !inventory?.profileId}>
        Geprüfte Rückgabe exportieren</ExportAction></FormActions>
    </form>
  </IndustrialPanel>;
}
