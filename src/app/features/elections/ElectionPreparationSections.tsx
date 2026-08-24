import { useState } from 'react';
import { FileText, Plus, Save } from 'lucide-react';
import type { ConfigureElectionSetupInput, ElectionNoticeDetails, ElectionPreparationOverview } from '../../../domain/models/election-workflow.model';
import { protectionStatusLabels, type PersonImportColumnMapping, type PersonImportPreviewResult } from '../../../domain/models/protected-person.model';
import type { ElectionKind, ElectionProcedure } from '../../../domain/models/election.model';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { CheckboxField, DateInput, FormActions, FormSection, SelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { buildDefaultPersonImportMapping, personImportFieldOptions, type PersonImportFieldKey, updatePersonImportColumnMapping } from '../../shared/import/personImportMapping';
import { electionBoardRoleLabel, electionCandidateEligibilityLabel, electionVoterListStatusLabel, officeTypeLabels, proposalStatusLabels } from './electionPresentation';
import { isoInstant, legalToday } from '../../../domain/time/legalTime';
import type { ElectionFeedback } from './electionDocumentFeedback';
import { electionDocumentFeedback } from './electionDocumentFeedback';

const today = legalToday;

const NOTICE_LABELS: Record<keyof ElectionNoticeDetails, string> = {
  issueDate: 'Erlassdatum',
  votingStartsAt: 'Beginn Stimmabgabe',
  votingEndsAt: 'Ende Stimmabgabe',
  votingPlace: 'Wahlort',
  countingPlaceAndTime: 'Ort/Zeit Auszählung',
  voterListInspectionPlace: 'Einsichtsort Wählerliste',
  voterListInspectionTimes: 'Einsichtzeiten Wählerliste',
  objectionDeadline: 'Einspruchsfrist',
  proposalDeadline: 'Frist Wahlvorschläge',
  proposalSubmissionPlace: 'Einreichungsort Wahlvorschläge',
  representativeElectionStatement: 'Wahl Vertrauensperson',
  deputyElectionStatement: 'Wahl Stellvertretungen',
  requiredSupportSignatures: 'Erforderliche Stützunterschriften',
  mailBallotStatement: 'Schriftliche Stimmabgabe',
  boardChairName: 'Vorsitz Wahlvorstand',
  secondBoardMemberName: 'Weiteres Wahlvorstandsmitglied',
};

const EMPTY_NOTICE = Object.fromEntries(Object.keys(NOTICE_LABELS).map((key) => [key, ''])) as unknown as ElectionNoticeDetails;

const ELECTION_KIND_OPTIONS = [
  { value: 'regular', label: 'Regelwahl' },
  { value: 'extraordinary_no_sbv', label: 'Außerordentlich – keine SBV' },
  { value: 'extraordinary_office_end', label: 'Außerordentlich – Amtsende' },
  { value: 'extraordinary_successful_challenge', label: 'Außerordentlich – erfolgreiche Anfechtung' },
  { value: 'deputy_by_election', label: 'Nachwahl Stellvertretung' },
];

export type ElectionRunner = <T>(
  operation: () => Promise<T>,
  feedback: string | ((result: T) => ElectionFeedback),
) => Promise<T | undefined>;

export function SetupSection({ overview, create, configure, run }: {
  overview: ElectionPreparationOverview | null;
  create: (input: { kind: ElectionKind; triggerReason?: string; incumbentTermEnd?: string; electionDate?: string }) => Promise<void>;
  configure: (input: ConfigureElectionSetupInput) => Promise<unknown>;
  run: ElectionRunner;
}) {
  const [kind, setKind] = useState<ElectionKind>('regular');
  const [reason, setReason] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [date, setDate] = useState('');
  const [severe, setSevere] = useState(0);
  const [equalized, setEqualized] = useState(0);
  const [pending, setPending] = useState(0);
  const [separated, setSeparated] = useState(false);
  const [procedure, setProcedure] = useState<ElectionProcedure | ''>('');
  const [deputies, setDeputies] = useState(1);
  const suggested = severe + equalized < 50 && !separated ? 'simplified' : 'formal';

  return (
    <div className="election-section-stack">
      <FormSection
        title="Neuen Wahlvorgang anlegen"
        actions={(
          <IndustrialButton onClick={() => void create({ kind, triggerReason: reason || undefined, incumbentTermEnd: termEnd || undefined, electionDate: date || undefined })}>
            <Plus className="h-4 w-4" /> Wahlvorgang anlegen
          </IndustrialButton>
        )}
      >
        <div className="industrial-form-grid industrial-form-grid-2 election-form-grid">
          <SelectInput label="Wahlart" value={kind} options={ELECTION_KIND_OPTIONS} onValueChange={(value) => setKind(value as ElectionKind)} />
          {kind !== 'regular' ? <TextInput label="Wahlgrund" value={reason} onValueChange={setReason} /> : null}
          <DateInput label="Ende bestehende Amtszeit" value={termEnd} onValueChange={setTermEnd} />
          <DateInput label="Wahltag" value={date} onValueChange={setDate} />
        </div>
      </FormSection>

      {overview ? (
        <FormSection
          title="Verfahrensprüfung"
          actions={(
            <>
              <IndustrialButton variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.markPreparation(overview.election.id), 'Wahlvorbereitung freigegeben.')}>Vorbereitung freigeben</IndustrialButton>
              <IndustrialButton onClick={() => void configure({ eligibilityCheckDate: today(), confirmedSeverelyDisabledCount: severe, confirmedEqualizedCount: equalized, pendingEqualizationCount: pending, spatiallySeparated: separated, procedure: procedure || undefined, deputyCount: deputies, electionDate: date || overview.election.electionDate })}>
                <Save className="h-4 w-4" /> Prüfung speichern
              </IndustrialButton>
            </>
          )}
        >
          <div className="industrial-form-grid industrial-form-grid-3 election-form-grid">
            <TextInput label="Bestätigt schwerbehindert" type="number" min="0" value={String(severe)} onValueChange={(value) => setSevere(Number(value))} />
            <TextInput label="Bestätigt gleichgestellt" type="number" min="0" value={String(equalized)} onValueChange={(value) => setEqualized(Number(value))} />
            <TextInput label="Offene Gleichstellungsanträge" type="number" min="0" value={String(pending)} onValueChange={(value) => setPending(Number(value))} />
            <SelectInput label="Verfahren" value={procedure} options={[{ value: '', label: 'Vorschlag übernehmen' }, { value: 'simplified', label: 'Vereinfacht' }, { value: 'formal', label: 'Förmlich' }]} onValueChange={(value) => setProcedure(value as ElectionProcedure | '')} />
            <TextInput label="Anzahl Stellvertretungen" type="number" min="1" value={String(deputies)} onValueChange={(value) => setDeputies(Math.max(1, Number(value)))} />
            <CheckboxField label="Räumlich weit auseinanderliegende Betriebsteile" checked={separated} onCheckedChange={setSeparated} />
          </div>
          <p className="industrial-meta">Vorschlag: {suggested === 'simplified' ? 'vereinfachtes' : 'förmliches'} Verfahren · Berechnungsbasis: {severe + equalized} bestätigte Wahlberechtigte.</p>
          {overview.conflicts.length > 0 ? <div className="industrial-message industrial-message-warning" role="status">{overview.conflicts.join(' ')}</div> : null}
        </FormSection>
      ) : null}
    </div>
  );
}

export function BodySection({ overview, run }: { overview: ElectionPreparationOverview; run: ElectionRunner }) {
  const simplified = overview.election.procedure === 'simplified';
  const [name, setName] = useState('');
  const [role, setRole] = useState<'chair' | 'member' | 'substitute' | 'election_leader' | 'assistant'>(simplified ? 'election_leader' : 'chair');
  const actualRole = simplified
    ? (role === 'election_leader' || role === 'assistant' ? role : 'election_leader')
    : (role === 'chair' || role === 'member' || role === 'substitute' ? role : 'chair');

  return (
    <div className="election-section-stack">
      <FormSection
        title={simplified ? 'Wahlleitung' : 'Wahlvorstand'}
        actions={<IndustrialButton onClick={() => void run(async () => { await window.gremiaSbv.elections.saveBoardMember(overview.election.id, { role: actualRole, name, adultConfirmed: true, employedConfirmed: true, appointedAt: today() }); setName(''); }, 'Wahlorgan gespeichert.')}><Save className="h-4 w-4" /> Speichern</IndustrialButton>}
      >
        <div className="industrial-form-grid industrial-form-grid-2 election-form-grid">
          <SelectInput label="Rolle" value={actualRole} options={simplified ? [{ value: 'election_leader', label: 'Wahlleitung' }, { value: 'assistant', label: 'Wahlhilfe' }] : [{ value: 'chair', label: 'Vorsitz' }, { value: 'member', label: 'Mitglied' }, { value: 'substitute', label: 'Ersatzmitglied' }]} onValueChange={(value) => setRole(value as typeof role)} />
          <TextInput label="Name" value={name} onValueChange={setName} />
        </div>
        {overview.boardMembers.length ? <ul className="election-record-list">{overview.boardMembers.map((member) => <li key={member.id}>{electionBoardRoleLabel(member.role)}: {member.name}</li>)}</ul> : <p className="industrial-empty-state">Noch kein Mitglied des Wahlorgans erfasst.</p>}
        {!simplified ? <FormActions><IndustrialButton variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.saveBoardSession(overview.election.id, { startsAt: isoInstant(), participants: overview.boardMembers.filter((member) => member.role !== 'substitute').map((member) => member.name), decisionsText: 'Beschlüsse dokumentiert.' }), 'Wahlvorstandssitzung dokumentiert.')}>Wahlvorstandssitzung erfassen</IndustrialButton></FormActions> : null}
      </FormSection>
    </div>
  );
}

export function VotersSection({ overview, run }: { overview: ElectionPreparationOverview; run: ElectionRunner }) {
  const [last, setLast] = useState('');
  const [first, setFirst] = useState('');
  const [birth, setBirth] = useState('');
  const [unit, setUnit] = useState('');
  const [basis, setBasis] = useState<'severely_disabled_confirmed' | 'equalized_confirmed' | 'pending_equalization_not_eligible'>('severely_disabled_confirmed');
  const [objection, setObjection] = useState('');
  const [importSource, setImportSource] = useState<{ sourceFileName: string; fileType: 'csv' | 'xlsx'; fileToken: string } | null>(null);
  const [importPreview, setImportPreview] = useState<PersonImportPreviewResult | null>(null);
  const [importMapping, setImportMapping] = useState<PersonImportColumnMapping>({});

  async function selectImportFile() {
    const selection = await window.gremiaSbv.elections.selectVoterImportFile();
    if (selection.canceled || !selection.fileToken || !selection.sourceFileName || !selection.fileType) return;
    const source = { fileToken: selection.fileToken, sourceFileName: selection.sourceFileName, fileType: selection.fileType };
    const discovery = await window.gremiaSbv.elections.previewVoterImport({
      ...source, csvEncoding: 'auto', delimiter: ';', headerRowIndex: 0, firstDataRowIndex: 1, mapping: {},
    });
    const mapping = buildDefaultPersonImportMapping(discovery.columns);
    const preview = await window.gremiaSbv.elections.previewVoterImport({
      ...source, csvEncoding: 'auto', delimiter: ';', headerRowIndex: 0, firstDataRowIndex: 1, mapping,
    });
    setImportSource(source);
    setImportMapping(mapping);
    setImportPreview(preview);
  }

  async function refreshImportPreview(mapping: PersonImportColumnMapping) {
    if (!importSource) return;
    const preview = await window.gremiaSbv.elections.previewVoterImport({
      ...importSource, csvEncoding: 'auto', delimiter: ';', headerRowIndex: 0, firstDataRowIndex: 1, mapping,
    });
    setImportMapping(mapping);
    setImportPreview(preview);
  }

  const voterImportFields = personImportFieldOptions.filter((field) => ['fullName', 'firstName', 'lastName', 'protectionStatus', 'organizationalUnit', 'leftCompanyAt'].includes(field.key));

  return (
    <div className="election-section-stack">
      <FormSection
        title="Wählerliste übernehmen"
        actions={(
          <>
            <IndustrialButton onClick={() => void run(() => window.gremiaSbv.elections.syncVotersFromPersons(overview.election.id), 'Wählerliste aus dem Personenverzeichnis aktualisiert.')}>
              Personen übernehmen
            </IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void selectImportFile()}>Excel-/CSV importieren</IndustrialButton>
          </>
        )}
      >
        {importSource && importPreview ? (
          <div className="election-import-panel">
            <div className="industrial-panel-header compact">
              <div>
                <h3>Importvorschau: {importSource.sourceFileName}</h3>
                <p className="industrial-meta">Bis zu 50 Zeilen werden vorab angezeigt; der eigentliche Import verarbeitet die vollständige Datei.</p>
              </div>
              <IndustrialButton onClick={() => void run(async () => {
                const result = await window.gremiaSbv.elections.importVotersFromPersonFile(overview.election.id, {
                  ...importSource, csvEncoding: 'auto', delimiter: ';', headerRowIndex: 0, firstDataRowIndex: 1, mapping: importMapping,
                });
                setImportSource(null); setImportPreview(null);
                return result;
              }, 'Wahlberechtigte aus Excel/CSV übernommen.')}>Datei übernehmen</IndustrialButton>
            </div>
            <div className="industrial-form-grid industrial-form-grid-3 election-form-grid">
              {voterImportFields.map((field) => (
                <SelectInput
                  key={field.key}
                  label={field.label}
                  value={String(importMapping[field.key as keyof PersonImportColumnMapping] ?? '')}
                  options={[{ value: '', label: 'Nicht importieren' }, ...importPreview.columns.map((column) => ({ value: column, label: column }))]}
                  onValueChange={(value) => void refreshImportPreview(updatePersonImportColumnMapping(importMapping, field.key as PersonImportFieldKey, value))}
                />
              ))}
            </div>
            {importPreview.rows.length ? (
              <div className="industrial-table-wrap">
                <table className="industrial-table">
                  <thead><tr><th>Name</th><th>Status</th><th>Hinweise</th></tr></thead>
                  <tbody>{importPreview.rows.slice(0, 8).map((row) => <tr key={row.rowNumber}><td>{row.lastName ?? '—'}, {row.firstName ?? '—'}</td><td>{row.protectionStatus ? protectionStatusLabels[row.protectionStatus] : '—'}</td><td>{row.validationErrors.join(' ') || 'übernehmbar'}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="industrial-empty-state">Keine importierbaren Zeilen in der Vorschau.</p>}
          </div>
        ) : null}
        {overview.voters.length ? <ul className="election-record-list">{overview.voters.map((voter) => <li key={voter.id}>{voter.lastName}, {voter.firstName}{voter.orgUnit ? ` · ${voter.orgUnit}` : ''} · {electionVoterListStatusLabel(voter.listStatus)}</li>)}</ul> : <p className="industrial-empty-state">Die Wählerliste ist noch leer. Übernehmen Sie zuerst die bestätigten Personen aus dem Personenverzeichnis.</p>}
      </FormSection>

      <details className="election-manual-entry">
        <summary>Einzelnen Eintrag manuell ergänzen</summary>
        <div className="election-manual-entry-body">
          <div className="industrial-form-grid industrial-form-grid-3 election-form-grid">
            <TextInput label="Nachname" value={last} onValueChange={setLast} />
            <TextInput label="Vorname" value={first} onValueChange={setFirst} />
            <DateInput label="Geburtsdatum, falls erforderlich" value={birth} onValueChange={setBirth} />
            <TextInput label="Betrieb/Dienststelle" value={unit} onValueChange={setUnit} />
            <SelectInput label="Statusbasis" value={basis} options={[{ value: 'severely_disabled_confirmed', label: 'Schwerbehinderung bestätigt' }, { value: 'equalized_confirmed', label: 'Gleichstellung bestätigt' }, { value: 'pending_equalization_not_eligible', label: 'Gleichstellung beantragt' }]} onValueChange={(value) => setBasis(value as typeof basis)} />
          </div>
          <FormActions><IndustrialButton variant="secondary" onClick={() => void run(async () => { await window.gremiaSbv.elections.saveVoter(overview.election.id, { lastName: last, firstName: first, birthDate: birth || undefined, orgUnit: unit || undefined, eligibilityBasis: basis, eligibilityVerifiedAt: today() }); setLast(''); setFirst(''); }, 'Wählerlisteneintrag gespeichert.')}><Plus className="h-4 w-4" /> Eintrag speichern</IndustrialButton></FormActions>
        </div>
      </details>

      {overview.election.procedure === 'formal' ? (
        <FormSection title="Einspruch Wählerliste" actions={<IndustrialButton variant="secondary" onClick={() => void run(async () => { await window.gremiaSbv.elections.saveObjection(overview.election.id, { receivedAt: today(), subjectRef: objection }); setObjection(''); }, 'Einspruchseingang dokumentiert.')}>Eingang dokumentieren</IndustrialButton>}>
          <TextInput label="Bezug" value={objection} onValueChange={setObjection} wide />
          {overview.objections.length ? <ul className="election-record-list">{overview.objections.map((item) => <li key={item.id}><span>{item.receivedAt}: {item.subjectRef} {item.notifiedAt ? '· erledigt' : ''}</span>{!item.notifiedAt ? <IndustrialButton compact variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.saveObjection(overview.election.id, { id: item.id, receivedAt: item.receivedAt, subjectRef: item.subjectRef, decisionAt: today(), decision: 'bearbeitet', notifiedAt: today() }), 'Einspruch entschieden und Mitteilung dokumentiert.')}>Entscheidung/Mitteilung</IndustrialButton> : null}</li>)}</ul> : <p className="industrial-empty-state">Keine Einsprüche dokumentiert.</p>}
        </FormSection>
      ) : null}
    </div>
  );
}

export function NominationsSection({ overview, run }: { overview: ElectionPreparationOverview; run: ElectionRunner }) {
  const [name, setName] = useState('');
  const [office, setOffice] = useState<'representative' | 'deputy'>('representative');
  const [age, setAge] = useState(18);
  const [months, setMonths] = useState(6);
  const [operationAge, setOperationAge] = useState(24);
  const [excluded, setExcluded] = useState(false);
  const [permanent, setPermanent] = useState(true);
  const required = Math.max(3, Math.ceil(overview.election.eligibleCountSnapshot / 20));

  return (
    <div className="election-section-stack">
      <FormSection title="Kandidatur" actions={<IndustrialButton onClick={() => void run(async () => { await window.gremiaSbv.elections.saveCandidate(overview.election.id, { officeType: office, personSnapshot: name, consentAt: today(), ageOnElectionDay: age, monthsInOperation: months, operationAgeMonths: operationAge, excludedFromRepresentativeBodyByLaw: excluded, notTemporaryEmployment: permanent }); setName(''); }, 'Kandidatur geprüft und gespeichert.')}><Plus className="h-4 w-4" /> Kandidatur speichern</IndustrialButton>}>
        <div className="industrial-form-grid industrial-form-grid-3 election-form-grid">
          <TextInput label="Person" value={name} onValueChange={setName} />
          <SelectInput label="Wahlgang" value={office} options={[{ value: 'representative', label: 'Vertrauensperson' }, { value: 'deputy', label: 'Stellvertretung' }]} onValueChange={(value) => setOffice(value as typeof office)} />
          <TextInput label="Alter am Wahltag" type="number" min="0" value={String(age)} onValueChange={(value) => setAge(Number(value))} />
          <TextInput label="Monate Betriebszugehörigkeit" type="number" min="0" value={String(months)} onValueChange={(value) => setMonths(Number(value))} />
          <TextInput label="Betrieb besteht seit Monaten" type="number" min="0" value={String(operationAge)} onValueChange={(value) => setOperationAge(Number(value))} />
          <CheckboxField label="Kraft Gesetzes vom Vertretungsorgan ausgeschlossen" checked={excluded} onCheckedChange={setExcluded} />
          <CheckboxField label="Nicht nur vorübergehend beschäftigt" checked={permanent} onCheckedChange={setPermanent} />
        </div>
        {overview.candidates.length ? <ul className="election-record-list">{overview.candidates.map((candidate) => <li key={candidate.id}>{officeTypeLabels[candidate.officeType]}: {candidate.personSnapshot} · {electionCandidateEligibilityLabel(candidate.eligibilityStatus)}</li>)}</ul> : <p className="industrial-empty-state">Noch keine Kandidatur erfasst.</p>}
      </FormSection>

      {overview.election.procedure === 'formal' ? (
        <FormSection title="Wahlvorschlag" actions={<><IndustrialButton variant="secondary" disabled={!overview.candidates.length} onClick={() => void run(() => window.gremiaSbv.elections.saveProposal(overview.election.id, { receivedAt: today(), validityStatus: 'valid', candidateIds: overview.candidates.map((candidate) => candidate.id), supporterVoterIds: overview.voters.filter((voter) => voter.listStatus === 'eligible').slice(0, required).map((voter) => voter.id) }), 'Wahlvorschlag gespeichert.')}>Vorschlag prüfen</IndustrialButton><IndustrialButton variant="secondary" onClick={() => void run(() => window.gremiaSbv.elections.startGracePeriod(overview.election.id, today()), 'Einwöchige Nachfrist angelegt.')}>Nachfrist starten</IndustrialButton></>}>
          <p className="industrial-meta">Erforderliche Stützunterschriften: {required}</p>
          {overview.proposals.length ? <ul className="election-record-list">{overview.proposals.map((proposal) => <li key={proposal.id}>{proposal.receivedAt}: {proposalStatusLabels[proposal.validityStatus]}{proposal.correctionDueAt ? ` · Frist ${proposal.correctionDueAt}` : ''}</li>)}</ul> : <p className="industrial-empty-state">Noch kein Wahlvorschlag dokumentiert.</p>}
        </FormSection>
      ) : null}
    </div>
  );
}

export function DocumentsSection({ overview, run }: { overview: ElectionPreparationOverview; run: ElectionRunner }) {
  const [notice, setNotice] = useState<ElectionNoticeDetails>(EMPTY_NOTICE);
  const generate = (kind: Parameters<typeof window.gremiaSbv.elections.generateDocument>[1]['kind'], extra: Record<string, unknown> = {}) => run(
    () => window.gremiaSbv.elections.generateDocument(overview.election.id, { kind, ...extra }),
    electionDocumentFeedback,
  );

  return (
    <div className="election-section-stack">
      <FormSection title="Vorbereitende Wahlunterlagen" description="Dokumente werden verschlüsselt in der Wahlakte gespeichert und anschließend in der externen PDF-Anwendung angefordert.">
        <FormActions align="start" className="election-document-actions">
          <IndustrialButton variant="secondary" onClick={() => void generate('setup_summary')}><FileText className="h-4 w-4" /> Wahl-Setup</IndustrialButton>
          <IndustrialButton variant="secondary" onClick={() => void generate('voter_list')}>Wählerliste</IndustrialButton>
          <IndustrialButton variant="secondary" onClick={() => void generate('candidate_announcement')}>Kandidaturen</IndustrialButton>
          {overview.election.procedure === 'formal' ? <><IndustrialButton variant="secondary" onClick={() => void generate('board_appointment')}>Bestellung Wahlvorstand</IndustrialButton>{overview.boardSessions[0] ? <IndustrialButton variant="secondary" onClick={() => void generate('board_minutes', { boardSessionId: overview.boardSessions[0].id })}>Niederschrift Wahlvorstand</IndustrialButton> : null}<IndustrialButton variant="secondary" onClick={() => void generate('proposal_correction_notice')}>Korrekturaufforderung</IndustrialButton><IndustrialButton variant="secondary" onClick={() => void generate('proposal_grace_notice')}>Nachfrist-Bekanntmachung</IndustrialButton></> : null}
          {overview.election.procedure === 'simplified' ? <><IndustrialButton variant="secondary" onClick={() => void generate('simplified_invitation')}>Einladung Wahlversammlung</IndustrialButton><IndustrialButton variant="secondary" onClick={() => void generate('election_leadership_minutes')}>Niederschrift Wahlleitung</IndustrialButton></> : null}
        </FormActions>
      </FormSection>

      {overview.election.procedure === 'formal' ? (
        <FormSection title="Wahlausschreiben – 16 Pflichtangaben" actions={<><IndustrialButton variant="secondary" disabled={!notice.issueDate} onClick={() => void run(() => window.gremiaSbv.elections.recordNoticeIssued(overview.election.id, notice.issueDate), 'Erlass dokumentiert; Einspruchs- und Vorschlagsfristen gestartet.')}>Erlass/Fristen dokumentieren</IndustrialButton><IndustrialButton onClick={() => void generate('election_notice', { notice })}>Wahlausschreiben als PDF erzeugen</IndustrialButton></>}>
          <div className="industrial-form-grid industrial-form-grid-2 election-notice-grid">
            {(Object.keys(NOTICE_LABELS) as Array<keyof ElectionNoticeDetails>).map((key) => <TextInput key={key} label={NOTICE_LABELS[key]} value={notice[key]} onValueChange={(value) => setNotice((current) => ({ ...current, [key]: value }))} />)}
          </div>
        </FormSection>
      ) : null}
    </div>
  );
}
