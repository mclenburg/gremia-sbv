import {
  IndustrialButton,
  ToolbarButton,
} from "../../../shared/components/IndustrialButton";
import {
  WorkbenchToolbar,
} from "../../../shared/components/WorkbenchLayout";
import type { ComplianceDocument } from "../../../../domain/models/compliance.model";

type PreviewBlock =
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "list"; items: string[] };

function displayText(line: string): string {
  return line.replace(/\*\*(.*?)\*\*/g, "$1").trim();
}

export function complianceDocumentPreviewBlocks(body: string): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  let pendingList: string[] = [];

  function flushList() {
    if (!pendingList.length) return;
    blocks.push({ id: `list-${blocks.length}`, type: "list", items: pendingList });
    pendingList = [];
  }

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push({ id: `heading-${blocks.length}`, type: "heading", level: 3, text: displayText(line.slice(3)) });
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      blocks.push({ id: `heading-${blocks.length}`, type: "heading", level: 2, text: displayText(line.slice(2)) });
      continue;
    }
    if (line.startsWith("- ")) {
      pendingList.push(displayText(line.slice(2)));
      continue;
    }
    flushList();
    blocks.push({ id: `paragraph-${blocks.length}`, type: "paragraph", text: displayText(line) });
  }

  flushList();
  return blocks;
}

function CompliancePreviewBody({ body }: { body: string }) {
  return (
    <div className="compliance-output compliance-document-preview-body" aria-label="Dokumentvorschau Inhalt">
      {complianceDocumentPreviewBlocks(body).map((block) => {
        if (block.type === "heading") {
          const Heading = block.level === 2 ? "h3" : "h4";
          return <Heading key={block.id}>{block.text}</Heading>;
        }
        if (block.type === "list") {
          return <ul key={block.id}>{block.items.map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)}</ul>;
        }
        return <p key={block.id}>{block.text}</p>;
      })}
    </div>
  );
}

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
      <CompliancePreviewBody body={document.body} />
    </section>
  );
}
