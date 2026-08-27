import {
  IndustrialButton,
  ToolbarButton,
} from "../../../shared/components/IndustrialButton";
import {
  WorkbenchToolbar,
} from "../../../shared/components/WorkbenchLayout";
import type { ComplianceDocument } from "../../../../domain/models/compliance.model";

export function ComplianceDocumentPreview({
  document,
  onExportPdf,
}: {
  document: ComplianceDocument;
  onExportPdf: (open: boolean) => void;
}) {
  return (
    <section
      className="industrial-panel compliance-preview"
      aria-label="Dokumentvorschau"
    >
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Vorschau</p>
          <h2>{document.title}</h2>
          <p>{document.description}</p>
        </div>
        <WorkbenchToolbar ariaLabel="PDF-Aktionen">
          <ToolbarButton onClick={() => onExportPdf(false)}>
            PDF erzeugen
          </ToolbarButton>
          <IndustrialButton onClick={() => onExportPdf(true)}>
            PDF erzeugen und öffnen
          </IndustrialButton>
        </WorkbenchToolbar>
      </div>
      <textarea
        className="industrial-output-area compliance-output"
        value={document.body}
        readOnly
        aria-label={`${document.title} Vorschau`}
      />
    </section>
  );
}
