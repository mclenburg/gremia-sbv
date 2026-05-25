import { Download } from "lucide-react";
import {
  IndustrialButton,
  ToolbarButton,
} from "../../../shared/components/IndustrialButton";
import {
  WorkbenchToolbar,
} from "../../../shared/components/WorkbenchLayout";
import type { ComplianceDocument } from "../../../core/models/compliance.model";

export function ComplianceDocumentPreview({
  document,
  onDownload,
  onExportPdf,
}: {
  document: ComplianceDocument;
  onDownload: () => void;
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
        <WorkbenchToolbar ariaLabel="Exportaktionen">
          <ToolbarButton onClick={onDownload}>
            <Download className="h-4 w-4" />
            Markdown exportieren
          </ToolbarButton>
          <ToolbarButton onClick={() => onExportPdf(false)}>
            PDF erzeugen
          </ToolbarButton>
          <IndustrialButton onClick={() => onExportPdf(true)}>
            PDF abrufen
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
