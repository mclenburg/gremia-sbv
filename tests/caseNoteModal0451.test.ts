import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.51 CaseNoteModal extraction", () => {
  it("adds a dedicated case note modal component", () => {
    expect(existsSync("src/app/features/cases/CaseNoteModal.tsx")).toBe(true);
    const component = readFileSync("src/app/features/cases/CaseNoteModal.tsx", "utf8");
    expect(component).toContain("export function CaseNoteModal");
    expect(component).toContain("Neue Gesprächsnotiz / neues Protokoll");
    expect(component).toContain("Fallbezüge");
    expect(component).toContain("onProtocolTextChange");
  });

  it("replaces the inline note modal in workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("import { CaseNoteModal } from './features/cases/CaseNoteModal';");
    expect(workflow).toContain("<CaseNoteModal");
    expect(workflow).not.toContain("id=\"case-note-title\"");
    expect(workflow).not.toContain("className=\"industrial-form case-note-form\"");
  });

  it("keeps inline command text handling wired through props", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const component = readFileSync("src/app/features/cases/CaseNoteModal.tsx", "utf8");
    expect(workflow).toContain("onProtocolTextChange={inlineCommands.handleProtocolTextChange}");
    expect(component).toContain("onProtocolTextChange('content'");
    expect(component).toContain("onProtocolTextChange('nextSteps'");
  });
});
