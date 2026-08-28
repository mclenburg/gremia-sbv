import { useMemo, useState } from "react";
import {
  CheckboxField,
  DateInput,
  FormSection,
  TextareaInput,
  TextInput,
} from "../../../shared/components/IndustrialForm";
import {
  ButtonGroup,
  IndustrialButton,
  ToolbarButton,
} from "../../../shared/components/IndustrialButton";
import type {
  ComplianceDocument,
  DataSubjectAccessPrivacyContactRole,
  DataSubjectAccessRequestInput,
} from "../../../../domain/models/compliance.model";
import type { ProtectedPersonRecord } from "../../../../domain/models/protected-person.model";
import { countPrefillRecords, privacyContactRoleLabel, type DataSubjectAccessReadiness } from "@/domain/compliance/dataSubjectAccessPolicy";
import { ComplianceDocumentPreview } from "./ComplianceDocumentPreview";

function personDisplayName(person: ProtectedPersonRecord): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.pseudonymLabel || "Unbenannte Person";
}

function personOptionLabel(person: ProtectedPersonRecord): string {
  return [
    personDisplayName(person),
    person.personnelNumber ? `PN ${person.personnelNumber}` : undefined,
    person.organizationalUnit,
    person.protectionStatus,
  ].filter(Boolean).join(" · ");
}

function normalized(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function workflowStepClass(done: boolean, blocked = false): string {
  if (done) return "done";
  if (blocked) return "blocked";
  return "open";
}

function DsarWorkflowSteps({ input, reviewCount }: { input: DataSubjectAccessRequestInput; reviewCount: number }) {
  return (
    <ol className="compliance-dsar-steps" aria-label="Bearbeitungsschritte der Art.-15-Zuarbeit">
      <li className={workflowStepClass(Boolean(input.requestReceivedAt))}>Anfrage</li>
      <li className={workflowStepClass(Boolean(input.requestForwardedAt))}>Weiterleitung</li>
      <li className={workflowStepClass(Boolean(input.subjectPersonId || input.requesterName.trim()))}>Person</li>
      <li className={workflowStepClass(Boolean(input.prefill))}>Inventur</li>
      <li className={workflowStepClass(input.sbvReviewCompleted, reviewCount > 0)}>Prüfung</li>
      <li className={workflowStepClass(Boolean(input.handedOverAt))}>Übergabe</li>
    </ol>
  );
}

function DsarRequestFields({
  input,
  onInputChange,
}: {
  input: DataSubjectAccessRequestInput;
  onInputChange: <K extends keyof DataSubjectAccessRequestInput>(key: K, value: DataSubjectAccessRequestInput[K]) => void;
}) {
  return (
    <div className="industrial-form-grid">
      <DateInput label="Eingang des Ersuchens" value={input.requestReceivedAt} onValueChange={(value) => onInputChange("requestReceivedAt", value)} required />
      <DateInput label="Bearbeitungsfrist" value={input.responseDueAt} onValueChange={(value) => onInputChange("responseDueAt", value)} required />
      <TextInput label="Verantwortliche Stelle" value={input.responsibleEntity} onValueChange={(value) => onInputChange("responsibleEntity", value)} helpText="Bei kleinen Betrieben ohne DSB z. B. Arbeitgeber, Geschäftsführung oder Personalstelle." />
      <label className="industrial-field">
        <span>Datenschutzkontakt</span>
        <select
          className="industrial-select"
          value={input.privacyContactRole}
          onChange={(event) => onInputChange("privacyContactRole", event.target.value as DataSubjectAccessPrivacyContactRole)}
        >
          <option value="unknown">{privacyContactRoleLabel("unknown")}</option>
          <option value="responsible_entity">{privacyContactRoleLabel("responsible_entity")}</option>
          <option value="data_protection_officer">{privacyContactRoleLabel("data_protection_officer")}</option>
        </select>
        <small>Der DSB ist optional; die Zuarbeit kann auch an die verantwortliche Stelle gehen.</small>
      </label>
      <TextInput label="Name Datenschutzkontakt / DSB" value={input.privacyContactName} onValueChange={(value) => onInputChange("privacyContactName", value)} />
      <TextInput label="E-Mail Datenschutzkontakt" value={input.privacyContactEmail} onValueChange={(value) => onInputChange("privacyContactEmail", value)} />
      <DateInput label="Weitergeleitet am" value={input.requestForwardedAt} onValueChange={(value) => onInputChange("requestForwardedAt", value)} />
      <TextInput label="Übergabeempfänger" value={input.handoverRecipient} onValueChange={(value) => onInputChange("handoverRecipient", value)} />
      <DateInput label="Übergeben am" value={input.handedOverAt} onValueChange={(value) => onInputChange("handedOverAt", value)} />
      <TextInput label="Bearbeitet durch" value={input.preparedBy} onValueChange={(value) => onInputChange("preparedBy", value)} />
      <CheckboxField label="Identität/Berechtigung als geprüft dokumentiert" checked={input.identityVerified} onCheckedChange={(checked) => onInputChange("identityVerified", checked)} helpText="Falls die Prüfung extern erfolgt, bleibt dies in der Zuarbeit sichtbar." />
      <CheckboxField label="SBV-Prüfung der Fundstellen abgeschlossen" checked={input.sbvReviewCompleted} onCheckedChange={(checked) => onInputChange("sbvReviewCompleted", checked)} helpText="Freitexte, Dokumente, Wahl- und Drittpersonenbezüge müssen geprüft sein." />
      <TextareaInput label="Umfang des Ersuchens" value={input.requestScope} onValueChange={(value) => onInputChange("requestScope", value)} wide />
    </div>
  );
}

function DsarPersonSelector({
  input,
  persons,
  onInputChange,
  onPersonSelect,
}: {
  input: DataSubjectAccessRequestInput;
  persons: ProtectedPersonRecord[];
  onInputChange: <K extends keyof DataSubjectAccessRequestInput>(key: K, value: DataSubjectAccessRequestInput[K]) => void;
  onPersonSelect: (personId: string) => void;
}) {
  const [personQuery, setPersonQuery] = useState("");
  const filteredPersons = useMemo(() => {
    const query = normalized(personQuery);
    if (!query) return persons.slice(0, 80);
    return persons.filter((person) => normalized(personOptionLabel(person)).includes(query)).slice(0, 80);
  }, [personQuery, persons]);
  const selectedPerson = persons.find((person) => person.id === input.subjectPersonId);

  return (
    <FormSection className="compliance-dsar-subsection" kicker="Person" title="Betroffene Person eindeutig auswählen" description="Die Suche grenzt das Personenverzeichnis ein. Bei großen Listen bleibt die Auswahl filterbar; Namenssuche ohne eindeutige Person wird nur als Suchhilfe verwendet." ariaLabel="Betroffene Person auswählen">
      <div className="industrial-form-grid">
        <TextInput label="Personenverzeichnis filtern" value={personQuery} onValueChange={setPersonQuery} helpText={`${filteredPersons.length} von ${persons.length} Personen sichtbar.`} />
        <label className="industrial-field">
          <span>Personenbezug</span>
          <select className="industrial-select" value={input.subjectPersonId ?? ""} onChange={(event) => onPersonSelect(event.target.value)}>
            <option value="">Keine eindeutige Person gewählt</option>
            {filteredPersons.map((person) => <option key={person.id} value={person.id}>{personOptionLabel(person)}</option>)}
          </select>
          <small>
            {selectedPerson ? `Gewählt: ${personOptionLabel(selectedPerson)}` : "Ohne Auswahl bleibt die Inventur eine unsichere Namens-/Aktenzeichensuche."}
          </small>
        </label>
        <TextInput label="Name der anfragenden Person" value={input.requesterName} onValueChange={(value) => onInputChange("requesterName", value)} required error={!input.requesterName.trim() ? "Name oder eindeutiger Personenbezug ist erforderlich." : undefined} />
        <TextInput label="Fall-/Aktenbezug" value={input.caseReference} onValueChange={(value) => onInputChange("caseReference", value)} helpText="Optionaler Zusatzfilter, falls das Ersuchen auf einen konkreten Vorgang beschränkt ist." />
      </div>
    </FormSection>
  );
}

function DsarActionArea({
  input,
  readiness,
  onPrefill,
  onRenderDsar,
}: {
  input: DataSubjectAccessRequestInput;
  readiness: DataSubjectAccessReadiness;
  onPrefill: () => void;
  onRenderDsar: () => void;
}) {
  const prefillCount = countPrefillRecords(input.prefill);
  const reviewCount = input.prefill?.reviewItems.length ?? 0;
  return (
    <>
      <ButtonGroup className="industrial-action-row" ariaLabel="Art.-15-Zuarbeit-Aktionen">
        <ToolbarButton onClick={onPrefill}>SBV-Dateninventur starten</ToolbarButton>
        <IndustrialButton onClick={onRenderDsar} disabled={!readiness.ready}>Geprüfte Zuarbeit erzeugen</IndustrialButton>
      </ButtonGroup>
      {input.prefill && (
        <div className="compliance-dsar-prefill-summary" aria-live="polite">
          <strong>Inventur vorbereitet:</strong> {prefillCount} Datensatzbezüge, {reviewCount} prüfpflichtige Fundstellen.
        </div>
      )}
      {!readiness.ready && (
        <div className="industrial-message industrial-message-warning" role="status">
          <strong>Nächste Schritte:</strong>
          <ul>{readiness.nextActions.map((action) => <li key={action}>{action}</li>)}</ul>
        </div>
      )}
    </>
  );
}

export function ComplianceDsarPanel({
  dsarInput,
  dsarReadiness,
  persons,
  document,
  onInputChange,
  onPersonSelect,
  onPrefill,
  onRenderDsar,
  onExportPdf,
}: {
  dsarInput: DataSubjectAccessRequestInput;
  dsarReadiness: DataSubjectAccessReadiness;
  persons: ProtectedPersonRecord[];
  document: ComplianceDocument;
  onInputChange: <K extends keyof DataSubjectAccessRequestInput>(
    key: K,
    value: DataSubjectAccessRequestInput[K],
  ) => void;
  onPersonSelect: (personId: string) => void;
  onPrefill: () => void;
  onRenderDsar: () => void;
  onExportPdf: (open: boolean) => void;
}) {
  const reviewCount = dsarInput.prefill?.reviewItems.length ?? 0;

  return (
    <div className="compliance-layout compliance-dsar-layout">
      <FormSection
        className="industrial-panel compliance-dsar-form"
        kicker="Art. 15 DSGVO"
        title="SBV-Zuarbeit zur Datenauskunft"
        description="Gremia.SBV sammelt die SBV-Daten zu einer Person und erstellt eine geprüfte Zuarbeit für Datenschutzkontakt oder verantwortliche Stelle. Die abschließende Herausgabeentscheidung liegt nicht bei der Software."
        ariaLabel="SBV-Zuarbeit zur Art.-15-Auskunft"
      >
        <DsarWorkflowSteps input={dsarInput} reviewCount={reviewCount} />
        <DsarRequestFields input={dsarInput} onInputChange={onInputChange} />
        <DsarPersonSelector input={dsarInput} persons={persons} onInputChange={onInputChange} onPersonSelect={onPersonSelect} />
        <DsarActionArea input={dsarInput} readiness={dsarReadiness} onPrefill={onPrefill} onRenderDsar={onRenderDsar} />
      </FormSection>
      <ComplianceDocumentPreview
        document={document}
        onExportPdf={onExportPdf}
      />
    </div>
  );
}
