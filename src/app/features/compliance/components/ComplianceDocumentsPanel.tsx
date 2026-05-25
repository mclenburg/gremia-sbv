import { IndustrialButton } from "../../../shared/components/IndustrialButton";
import {
  EmptyState,
  IndustrialSelectionCard,
  RecordList,
} from "../../../shared/components/WorkbenchLayout";
import type {
  ComplianceDocument,
  ComplianceDocumentType,
} from "../../../core/models/compliance.model";
import { DOCUMENT_WORKSPACE_EXCLUDED_TYPES } from "../complianceConstants";
import { ComplianceDocumentPreview } from "./ComplianceDocumentPreview";

export function ComplianceDocumentsPanel({
  descriptors,
  selectedType,
  document,
  onRender,
  onDownload,
  onExportPdf,
}: {
  descriptors: Array<{
    type: ComplianceDocumentType;
    title: string;
    description: string;
    buttonLabel: string;
  }>;
  selectedType: ComplianceDocumentType;
  document: ComplianceDocument;
  onRender: (type: ComplianceDocumentType) => void;
  onDownload: () => void;
  onExportPdf: (open: boolean) => void;
}) {
  return (
    <div className="compliance-layout">
      <section className="compliance-actions" aria-label="Compliance-Dokumente">
        <RecordList
          items={descriptors.filter(
            (item) => !DOCUMENT_WORKSPACE_EXCLUDED_TYPES.includes(item.type),
          )}
          getKey={(item) => item.type}
          ariaLabel="Compliance-Unterlagen"
          empty={<EmptyState text="Keine Compliance-Unterlagen verfügbar." />}
          renderItem={(item) => (
            <IndustrialSelectionCard selected={selectedType === item.type}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <IndustrialButton onClick={() => onRender(item.type)}>
                {item.buttonLabel}
              </IndustrialButton>
            </IndustrialSelectionCard>
          )}
        />
      </section>
      <ComplianceDocumentPreview
        document={document}
        onDownload={onDownload}
        onExportPdf={onExportPdf}
      />
    </div>
  );
}
