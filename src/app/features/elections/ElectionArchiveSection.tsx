import { useState } from 'react';
import type { ElectionExecutionOverview } from '../../../domain/models/election-execution.model';
import type { ElectionPreparationOverview } from '../../../domain/models/election-workflow.model';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { CheckboxField, DateInput, FormActions, FormSection, PasswordInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import type { ElectionRunner } from './ElectionPreparationSections';
import { electionDocumentFeedback } from './electionDocumentFeedback';

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
  const [targetRecipientToken, setTargetRecipientToken] = useState('');
  const [transferFileToken, setTransferFileToken] = useState('');
  const [transferFileName, setTransferFileName] = useState('');

  return (
    <div className="election-section-stack">
      <FormSection
        title="Originalunterlagen"
        actions={<IndustrialButton onClick={() => void run(() => window.gremiaSbv.elections.savePhysicalRecord(overview.election.id, { recordType, description, storageLocation: storageLocation || undefined, originalRequired: true, sealedStatus: 'aufbewahrt' }), 'Bestandsverzeichnis aktualisiert.')}>Originalunterlage erfassen</IndustrialButton>}
      >
        <div className="industrial-form-grid industrial-form-grid-3 election-form-grid">
          <TextInput label="Typ" value={recordType} onValueChange={setRecordType} />
          <TextInput label="Beschreibung" value={description} onValueChange={setDescription} />
          <TextInput label="Aufbewahrungsort" value={storageLocation} onValueChange={setStorageLocation} />
        </div>
        {execution.physicalRecords.length ? <ul className="election-record-list">{execution.physicalRecords.map((record) => <li key={record.id}>{record.recordType} · {record.quantity} · {record.storageLocation ?? 'Ort offen'}</li>)}</ul> : <p className="industrial-empty-state">Noch keine Originalunterlage erfasst.</p>}
      </FormSection>

      <FormSection
        title="Abschluss und Übergabe"
        actions={<IndustrialButton disabled={!announcementStartedAt || !announcementEndedAt || !employerNotifiedAt || !councilNotifiedAt || !retentionUntil} onClick={() => void run(() => window.gremiaSbv.elections.close(overview.election.id, { announcementStartedAt, announcementEndedAt, employerNotifiedAt, councilNotifiedAt, retentionUntil, challengePending }), 'Wahl abgeschlossen; § 163 Abs. 8-Folgevorgang angelegt.')}>Wahl abschließen</IndustrialButton>}
      >
        <div className="industrial-form-grid industrial-form-grid-3 election-form-grid">
          <DateInput label="Beginn Bekanntmachung" value={announcementStartedAt} onValueChange={setAnnouncementStartedAt} />
          <DateInput label="Ende Bekanntmachung" value={announcementEndedAt} onValueChange={setAnnouncementEndedAt} />
          <DateInput label="Arbeitgeber informiert" value={employerNotifiedAt} onValueChange={setEmployerNotifiedAt} />
          <DateInput label="BR/PR informiert" value={councilNotifiedAt} onValueChange={setCouncilNotifiedAt} />
          <DateInput label="Aufbewahrung mindestens bis" value={retentionUntil} onValueChange={setRetentionUntil} />
          <CheckboxField label="Wahlanfechtung/Verfahren offen – Legal Hold setzen" checked={challengePending} onCheckedChange={setChallengePending} />
        </div>
        <FormActions align="start" className="election-document-actions">
          <IndustrialButton variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'result_announcement' }), electionDocumentFeedback)}>Bekanntmachung PDF</IndustrialButton>
          <IndustrialButton variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'physical_inventory' }), electionDocumentFeedback)}>Bestandsverzeichnis PDF</IndustrialButton>
          <IndustrialButton variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.generateExecutionDocument(overview.election.id, { kind: 'handover_protocol' }), electionDocumentFeedback)}>Übergabeprotokoll</IndustrialButton>
          <IndustrialButton variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.exportPdfArchive(overview.election.id), electionDocumentFeedback)}>Gesamt-Wahlakte PDF</IndustrialButton>
        </FormActions>
        <p className="industrial-message industrial-message-warning">Digitale Exporte ersetzen physische Originale, insbesondere Stimmzettel, nicht.</p>
      </FormSection>

      <FormSection title="Geschützter Gremia.SBV-Transfer" description="Geschützte Wahlakten werden vor dem Import geprüft und atomar mit lokalen IDs übernommen.">
        <TextareaInput label="Empfängerkennung der Zielinstanz" value={targetRecipientToken} rows={4} placeholder="GSBV1.… aus Einstellungen → Allgemein der Zielinstanz einfügen" onValueChange={setTargetRecipientToken} />
        <PasswordInput label="Passphrase" value={passphrase} onValueChange={setPassphrase} />
        <FormActions align="start" className="election-document-actions">
          <IndustrialButton variant="secondary" disabled={passphrase.length < 10 || !targetRecipientToken.trim()} onClick={() => void run(() => window.gremiaSbv.elections.exportTransferFile(overview.election.id, passphrase, targetRecipientToken), 'Geschützte Wahlakte exportiert und vor dem Schreiben verifiziert.')}>Transferdatei exportieren</IndustrialButton>
          <IndustrialButton variant="secondary" disabled={passphrase.length < 10} onClick={() => void (async () => { const selected = await run(() => window.gremiaSbv.elections.selectTransferFile(passphrase), 'Transferdatei geprüft.'); if (selected && !selected.canceled) { setTransferFileToken(selected.fileToken); setTransferFileName(selected.fileName); } })()}>Transferdatei auswählen und prüfen</IndustrialButton>
          <IndustrialButton disabled={!transferFileToken || passphrase.length < 10} onClick={() => void run(() => window.gremiaSbv.elections.importTransferFile(transferFileToken, passphrase), 'Wahlakte atomar importiert; lokale IDs und Auditkette bleiben getrennt.')}>Geprüfte Wahlakte importieren</IndustrialButton>
        </FormActions>
        {transferFileName ? <p className="industrial-meta">Ausgewählt: {transferFileName}</p> : null}
      </FormSection>
    </div>
  );
}
