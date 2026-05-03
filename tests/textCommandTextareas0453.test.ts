import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const editableTextareaFiles = [
  "src/app/workflowViews.tsx",
  "src/app/features/cases/CaseProcessDraftModal.tsx",
  "src/app/features/cases/CaseNoteModal.tsx",
  "src/app/features/templates/TemplatesView.tsx",
  "src/app/features/knowledge/KnowledgeView.tsx",
  "src/app/features/prevention/PreventionProcessDetail.tsx"
];

describe("0.4.53 reusable text command textareas", () => {
  it("adds a shared TextCommandTextarea component", () => {
    expect(existsSync("src/app/shared/textCommands/TextCommandTextarea.tsx")).toBe(true);
    const source = readFileSync("src/app/shared/textCommands/TextCommandTextarea.tsx", "utf8");
    expect(source).toContain("export function TextCommandTextarea");
    expect(source).toContain("findFirstTextCommand");
    expect(source).toContain("gremia-sbv:text-command-detected");
    expect(source).toContain("data-text-command-enabled");
  });

  it("uses TextCommandTextarea for editable large text fields", () => {
    for (const file of editableTextareaFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("TextCommandTextarea");
    }

    const noteModal = readFileSync("src/app/features/cases/CaseNoteModal.tsx", "utf8");
    expect(noteModal).toContain('fieldId="case-note-content"');
    expect(noteModal).toContain('fieldId="case-note-next-steps"');
    expect(noteModal).toContain("onProtocolTextChange('content'");
  });

  it("does not leave raw editable textareas in the migrated feature files", () => {
    for (const file of editableTextareaFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/<textarea(?![^>]*readOnly)/);
    }
  });

  it("keeps readonly export preview textarea unchanged", () => {
    const source = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");
    expect(source).toContain('<textarea className="industrial-output-area" value={state.rendered.body} readOnly />');
  });
});
