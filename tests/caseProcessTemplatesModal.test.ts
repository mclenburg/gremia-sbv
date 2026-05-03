import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case process templates and status sections", () => {
  it("shows prevention fields in status-gated sections", () => {
    const detail = readFileSync("src/app/features/prevention/PreventionProcessDetail.tsx", "utf8");
    expect(detail).toContain("prevention-status-section");
    expect(detail).toContain("canShowEmployerReactionSection(process.status)");
    expect(detail).toContain("Eine Arbeitgeberreaktion wird deshalb erst nach dokumentierter Anforderung geführt.");
  });

  it("adds a document link next to the measure badge and opens a template modal", () => {
    const detail = readFileSync("src/app/features/prevention/PreventionProcessDetail.tsx", "utf8");
    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(detail).toContain("case-process-document-link");
    expect(detail).toContain("onOpenTemplates(process)");
    expect(modal).toContain("process-template-modal");
    expect(workflow).toContain("renderAndDownloadProcessTemplate");
  });

  it("supports status-bound prevention templates", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const templates = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(workflow).toContain("isTemplateConnectedToPreventionStatus");
    expect(workflow).toContain("massnahme:prevention");
    expect(templates).toContain("status:${newTemplateProcessStatus}");
    expect(workflow).toContain("praevention.massnahmen");
  });

  it("styles the document modal and status sections", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-process-document-link");
    expect(css).toContain(".prevention-status-section");
    expect(css).toContain(".process-template-modal");
    expect(css).toContain(".process-template-card");
  });
});
