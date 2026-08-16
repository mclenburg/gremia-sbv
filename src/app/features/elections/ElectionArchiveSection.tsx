import { useState } from 'react';
import type { ElectionExecutionOverview } from '../../core/models/election-execution.model';
import type { ElectionPreparationOverview } from '../../core/models/election-workflow.model';
import type { ElectionRunner } from './ElectionPreparationSections';

type ArchiveSectionProps = { overview: ElectionPreparationOverview; execution: ElectionExecutionOverview; run: ElectionRunner };

export function ArchiveSection({ overview, execution, run }: ArchiveSectionProps) {
  const [recordType, setRecordType] = useState('stimmzettel');
  const [description, setDescription] = useState('Stimmzettel');
  const [storageLocation, setStorageLocation] = useState('');
  const [announcementStartedAt, setAnnouncementStartedAt] = useState('');
  const [announcementEndedAt, setAnnouncementEndedAt] = useState('');
  const [employerNotifiedAt, setEmployerNotifiedAt] = useState('');
  const [councilNotifiedAt, setCouncilNotifiedAt] = useState('');
  const [retentionUntil, setRetentionUntil] = useState(overview.election.officeTermEnd ?? '');
  const [challengePending, setChallengePending] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [transferFileToken, setTransferFileToken] = useState('');
  const [transferFileName, setTransferFileName] = useState('');

  return (
    <div className="industrial-settings-form mt-4">
      <fieldset>
        <legend>Originalunterlagen</legend>
        <label><span>Typ</span><input value={recordType} onChange={(event) => setRecordType(event.target.value)} /></label>
        <label><span>Beschreibung</span><input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label><span>Aufbewahrungsort</span><input value={storageLocation} onChange={(event) => setStorageLocation(event.target.value)} /></label>
        <button
          type="button"
          className="industrial-button"
          onClick={() => void run(
            () => window.gremiaSbv.elections.savePhysicalRecord(overview.election.id, {
              recordType,
              description,
              storageLocation: storageLocation || undefined,
              originalRequired: true,
              sealedStatus: 'aufbewahrt',
            }),
            'Bestandsverzeichnis aktualisiert.',
          )}
        >
          Originalunterlage erfassen
        </button>
        <ul>{execution.physicalRecords.map((record) => <li key={record.id}>{record.recordType} · {record.quantity} · {record.storageLocation ?? 'Ort offen'}</li>)}</ul>
      </fieldset>

      <fieldset>
        <legend>Abschluss und Übergabe</legend>
        <label><span>Beginn Bekanntmachung</span><input type="date" value={announcementStartedAt} onChange={(event) => setAnnouncementStartedAt(event.target.value)} /></label>
        <label><span>Ende Bekanntmachung</span><input type="date" value={announcementEndedAt} onChange={(event) => setAnnouncementEndedAt(event.target.value)} /></label>
        <label><span>Arbeitgeber informiert</span><input type="date" value={employerNotifiedAt} onChange={(event) => setEmployerNotifiedAt(event.target.value)} /></label>
        <label><span>BR/PR informiert</span><input type="date" value={councilNotifiedAt} onChange={(event) => setCouncilNotifiedAt(event.target.value)} /></label>
        <label><span>Aufbewahrung mindestens bis</span><input type="date" value={retentionUntil} onChange={(event) => setRetentionUntil(event.target.value)} /></label>
        <label><input type="checkbox" checked={challengePending} onChange={(event) => setChallengePending(event.target.checked)} /> Wahlanfechtung/Verfahren offen – Legal Hold setzen</label>
        <div className="industrial-button-row">
          <button type="button" className="industrial-secondary-button" onClick={() => void run(async () => { const document = await window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'result_announcement' }); return window.gremiaSbv.elections.exportDocument(document.id, document.filename); }, 'Ergebnisbekanntmachung gespeichert; Dateiexport angeboten.')}>Bekanntmachung PDF</button>
          <button type="button" className="industrial-secondary-button" onClick={() => void run(async () => { const document = await window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'physical_inventory' }); return window.gremiaSbv.elections.exportDocument(document.id, document.filename); }, 'Bestandsverzeichnis gespeichert; Dateiexport angeboten.')}>Bestandsverzeichnis PDF</button>
          <button type="button" className="industrial-secondary-button" onClick={() => void run(async () => { const document = await window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'handover_protocol' }); return window.gremiaSbv.elections.exportDocument(document.id, document.filename); }, 'Übergabeprotokoll gespeichert; Dateiexport angeboten.')}>Übergabeprotokoll</button>
          <button type="button" className="industrial-secondary-button" onClick={() => void run(async () => { const document = await window.gremiaSbv.elections.exportPdfArchive(overview.election.id); return window.gremiaSbv.elections.exportDocument(document.id, document.filename); }, 'Menschenlesbare PDF-Wahlakte gespeichert; Dateiexport angeboten.')}>Gesamt-Wahlakte PDF</button>
        </div>
        <button
          type="button"
          className="industrial-button"
          disabled={!announcementStartedAt || !announcementEndedAt || !employerNotifiedAt || !councilNotifiedAt || !retentionUntil}
          onClick={() => void run(
            () => window.gremiaSbv.elections.close(overview.election.id, {
              announcementStartedAt,
              announcementEndedAt,
              employerNotifiedAt,
              councilNotifiedAt,
              retentionUntil,
              challengePending,
            }),
            'Wahl abgeschlossen; § 163 Abs. 8-Folgevorgang angelegt.',
          )}
        >
          Wahl abschließen
        </button>
        <p className="industrial-message industrial-message-warning">
          Digitale Exporte ersetzen physische Originale, insbesondere Stimmzettel, nicht.
        </p>
      </fieldset>

      <fieldset>
        <legend>Geschützter Gremia.SBV-Transfer</legend>
        <label><span>Passphrase</span><input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} /></label>
        <button
          type="button"
          className="industrial-secondary-button"
          disabled={passphrase.length < 10}
          onClick={() => void run(
            () => window.gremiaSbv.elections.exportTransferFile(overview.election.id, passphrase),
            'Geschützte Wahlakte exportiert und vor dem Schreiben verifiziert.',
          )}
        >
          Transferdatei exportieren
        </button>
        <button
          type="button"
          className="industrial-secondary-button"
          disabled={passphrase.length < 10}
          onClick={() => void (async () => {
            const selected = await run(() => window.gremiaSbv.elections.selectTransferFile(passphrase), 'Transferdatei geprüft.');
            if (selected && !selected.canceled) { setTransferFileToken(selected.fileToken); setTransferFileName(selected.fileName); }
          })()}
        >
          Transferdatei auswählen und prüfen
        </button>
        {transferFileName && <p className="industrial-meta">Ausgewählt: {transferFileName}</p>}
        <button
          type="button"
          className="industrial-button"
          disabled={!transferFileToken || passphrase.length < 10}
          onClick={() => void run(
            () => window.gremiaSbv.elections.importTransferFile(transferFileToken, passphrase),
            'Wahlakte atomar importiert; lokale IDs und Auditkette bleiben getrennt.',
          )}
        >
          Geprüfte Wahlakte importieren
        </button>
      </fieldset>
    </div>
  );
}
