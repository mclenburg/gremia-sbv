import { describe, expect, it } from "vitest";
import { listComplianceDocuments, renderComplianceDocument } from "../../../services/complianceCenterService";
import { ComplianceDocumentPreview, complianceDocumentPreviewBlocks } from "../../../src/app/features/compliance/components/ComplianceDocumentPreview";
import { ComplianceDocumentsPanel } from "../../../src/app/features/compliance/components/ComplianceDocumentsPanel";
import { buildPdfExportFeedback } from "../../../src/app/shared/documents/pdfExportFeedback";
import { renderComponent, visibleText } from "../../helpers/renderedMarkup";

const noop = () => undefined;

describe("Compliance-Dokumentworkflow", () => {
  it("bietet Compliance-Unterlagen einheitlich als PDF-Workflow ohne Markdown-Sonderexport an", () => {
    const { markup } = renderComponent(ComplianceDocumentPreview, {
      document: renderComplianceDocument("toms"),
      onExportPdf: noop,
    });
    const text = visibleText(markup);

    expect(text).not.toContain("Markdown");
    expect(text).toContain("PDF erzeugen");
    expect(text).toContain("PDF erzeugen und öffnen");
    expect(markup).not.toContain("<textarea");
    expect(text).not.toContain("# TOMs");
    expect(complianceDocumentPreviewBlocks("# Titel\n\n- **Punkt**")).toEqual([
      { id: "heading-0", type: "heading", level: 2, text: "Titel" },
      { id: "list-1", type: "list", items: ["Punkt"] },
    ]);
  });

  it("zeigt nur fachliche Anwenderunterlagen und priorisiert notwendige Compliance-Nachweise", () => {
    const { markup } = renderComponent(ComplianceDocumentsPanel, {
      descriptors: listComplianceDocuments(),
      selectedType: "toms",
      document: renderComplianceDocument("toms"),
      onRender: noop,
      onExportPdf: noop,
      onExportNotice: noop,
    });
    const text = visibleText(markup);

    expect(text).not.toContain("Release-Checkliste");
    expect(text).not.toContain('Technischer Datenschutzstatus');
    expect(text).not.toContain('Prozess Betroffenenrechte');
    expect(text).not.toContain('Export- und Weitergaberegeln');
    expect(text).not.toContain('DSGVO-/BDSG-Compliance-Auswertung');
    expect(text.indexOf("TOMs")).toBeLessThan(text.indexOf("VVT-Eintrag"));
    expect(text.indexOf("VVT-Eintrag")).toBeLessThan(text.indexOf("Lösch- und Aufbewahrungskonzept"));
    expect(text.indexOf("Lösch- und Aufbewahrungskonzept")).toBeLessThan(text.indexOf("DSFA-Entwurf"));
  });

  it("zeigt für die Datenschutzinformation Eingabefelder und eine Druckaktion", () => {
    const { markup } = renderComponent(ComplianceDocumentsPanel, {
      descriptors: listComplianceDocuments(),
      selectedType: 'data_protection_notice',
      document: renderComplianceDocument('toms'),
      onRender: noop,
      onExportPdf: noop,
      onExportNotice: noop,
    });
    const text = visibleText(markup);
    expect(text).toContain('Kontakt der verantwortlichen Stelle');
    expect(text).toContain('Speicherdauer oder Kriterien');
    expect(text).toContain('PDF zum Drucken öffnen');
    expect(text).not.toContain('Diese Vorlage unterstützt');
  });

  it("unterscheidet PDF-Speicherung von erfolgloser externer Vorschau", () => {
    const feedback = buildPdfExportFeedback({
      title: "TOMs",
      fileName: "toms.pdf",
      openRequested: true,
      openResult: { opened: false, error: "Viewer nicht erreichbar." },
    });

    expect(feedback.status).toBe("preview_unavailable");
    expect(feedback.announceMode).toBe("assertive");
    expect(feedback.message).toContain("verschlüsselter PDF-Report");
    expect(feedback.message).toContain("externe Vorschau konnte aber nicht angefordert werden");
  });
});
