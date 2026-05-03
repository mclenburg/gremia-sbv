import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case process templates and status sections", () => {
  it("shows prevention fields in status-gated sections", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("prevention-status-section");
    expect(app).toContain("canShowEmployerReactionSection(process.status)");
    expect(app).toContain("Eine Arbeitgeberreaktion wird deshalb erst nach dokumentierter Anforderung geführt.");
  });

  it("adds a document link next to the measure badge and opens a template modal", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("case-process-document-link");
    expect(app).toContain("openProcessTemplateModal(process)");
    expect(app).toContain("process-template-modal");
    expect(app).toContain("renderAndDownloadProcessTemplate");
  });

  it("supports status-bound prevention templates", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("isTemplateConnectedToPreventionStatus");
    expect(app).toContain("massnahme:prevention");
    expect(app).toContain("status:${newTemplateProcessStatus}");
    expect(app).toContain("praevention.massnahmen");
  });

  it("styles the document modal and status sections", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-process-document-link");
    expect(css).toContain(".prevention-status-section");
    expect(css).toContain(".process-template-modal");
    expect(css).toContain(".process-template-card");
  });
});
