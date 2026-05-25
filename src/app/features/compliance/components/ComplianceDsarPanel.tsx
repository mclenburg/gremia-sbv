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
  DataSubjectAccessRequestInput,
} from "../../../core/models/compliance.model";
import { ComplianceDocumentPreview } from "./ComplianceDocumentPreview";

export function ComplianceDsarPanel({
  dsarInput,
  document,
  onInputChange,
  onPrefill,
  onRenderDsar,
  onDownload,
  onExportPdf,
}: {
  dsarInput: DataSubjectAccessRequestInput;
  document: ComplianceDocument;
  onInputChange: <K extends keyof DataSubjectAccessRequestInput>(
    key: K,
    value: DataSubjectAccessRequestInput[K],
  ) => void;
  onPrefill: () => void;
  onRenderDsar: () => void;
  onDownload: () => void;
  onExportPdf: (open: boolean) => void;
}) {
  return (
    <div className="compliance-layout">
      <FormSection
        className="industrial-panel compliance-dsar-form"
        kicker="Art. 15 DSGVO"
        title="Auskunftsersuchen beantworten"
        description="Die Vorbefüllung durchsucht strukturierte Daten und relevante Freitextbezüge; die Antwort bleibt vor Versand manuell zu prüfen."
        ariaLabel="DSGVO-Auskunftsersuchen"
      >
        <div className="industrial-form-grid">
          <TextInput
            label="Name der anfragenden Person"
            value={dsarInput.requesterName}
            onValueChange={(value) => onInputChange("requesterName", value)}
            required
            error={
              !dsarInput.requesterName.trim()
                ? "Name ist für die Auskunftsantwort erforderlich."
                : undefined
            }
          />
          <TextInput
            label="Fall-/Aktenbezug"
            value={dsarInput.caseReference}
            onValueChange={(value) => onInputChange("caseReference", value)}
          />
          <DateInput
            label="Eingang"
            value={dsarInput.requestReceivedAt}
            onValueChange={(value) => onInputChange("requestReceivedAt", value)}
            required
          />
          <DateInput
            label="Antwortfrist"
            value={dsarInput.responseDueAt}
            onValueChange={(value) => onInputChange("responseDueAt", value)}
            required
          />
          <TextInput
            label="Bearbeitet durch"
            value={dsarInput.preparedBy}
            onValueChange={(value) => onInputChange("preparedBy", value)}
          />
          <CheckboxField
            label="Identität geprüft"
            checked={dsarInput.identityVerified}
            onCheckedChange={(checked) =>
              onInputChange("identityVerified", checked)
            }
            helpText="Die Antwort sollte erst nach Identitätsprüfung herausgegeben werden."
          />
          <TextareaInput
            label="Umfang des Ersuchens"
            value={dsarInput.requestScope}
            onValueChange={(value) => onInputChange("requestScope", value)}
            wide
          />
        </div>
        <ButtonGroup className="industrial-action-row" ariaLabel="DSAR-Aktionen">
          <ToolbarButton onClick={onPrefill}>
            Daten aus Gremia.SBV vorbefüllen
          </ToolbarButton>
          <IndustrialButton onClick={onRenderDsar}>
            Auskunftsantwort erzeugen
          </IndustrialButton>
        </ButtonGroup>
        {dsarInput.prefill && (
          <p className="compliance-dsar-prefill-summary" aria-live="polite">
            Vorbefüllt: {dsarInput.prefill.persons.length} Personen, {" "}
            {dsarInput.prefill.cases.length} Fallakten, {" "}
            {dsarInput.prefill.deadlines.length} Fristen, {" "}
            {dsarInput.prefill.measures.length} Maßnahmen, {" "}
            {dsarInput.prefill.importRuns.length} Importe, {" "}
            {dsarInput.prefill.lifecycleEvents.length} Lifecycle-Ereignisse, {" "}
            {dsarInput.prefill.freeTextMatches.length} Freitexttreffer.
          </p>
        )}
      </FormSection>
      <ComplianceDocumentPreview
        document={document}
        onDownload={onDownload}
        onExportPdf={onExportPdf}
      />
    </div>
  );
}
