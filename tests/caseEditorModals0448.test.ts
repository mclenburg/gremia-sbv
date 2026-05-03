import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.48 case editor modals and document split", () => {
  it("adds extracted case modal and document components", () => {
    expect(existsSync("src/app/features/cases/CaseCreateModal.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/CaseProcessDraftModal.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/CaseDocumentDetail.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/CaseWorkbenchFooter.tsx")).toBe(true);
  });

  it("uses extracted case components from workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("<CaseCreateModal");
    expect(workflow).toContain("<CaseProcessDraftModal");
    expect(workflow).toContain("<CaseDocumentDetail");
    expect(workflow).toContain("<CaseWorkbenchFooter");
    expect(workflow).not.toContain("<footer className=\"case-workbench-footer\"");
    expect(workflow).not.toContain("{isCaseCreateModalOpen && (");
  });

  it("prepares document and note-editor boundaries", () => {
    expect(existsSync("src/app/features/cases/useCaseDocuments.ts")).toBe(true);
    expect(existsSync("src/app/features/cases/useCaseNoteEditor.ts")).toBe(true);
    expect(existsSync("src/app/features/cases/InlineCommandOverlays.tsx")).toBe(true);
    const docs = readFileSync("src/app/features/cases/useCaseDocuments.ts", "utf8");
    expect(docs).toContain("createCaseDocumentActions");
  });
});
