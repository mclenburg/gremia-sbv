import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.55 Case note editor hook", () => {
  it("adds a dedicated useCaseNoteEditor hook", () => {
    expect(existsSync("src/app/features/cases/useCaseNoteEditor.ts")).toBe(true);
    const hook = readFileSync("src/app/features/cases/useCaseNoteEditor.ts", "utf8");
    expect(hook).toContain("export function useCaseNoteEditor");
    expect(hook).toContain("resetNoteForm");
    expect(hook).toContain("startEditNote");
    expect(hook).toContain("saveNote");
    expect(hook).toContain("bindClearInlineDrafts");
  });

  it("removes note editor state and save logic from workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("useCaseNoteEditor");
    expect(workflow).toContain("const noteEditor = useCaseNoteEditor");
    expect(workflow).toContain("bindClearInlineDrafts(inlineCommands.clearInlineDrafts)");
    expect(workflow).not.toContain("function resetNoteForm()");
    expect(workflow).not.toContain("function startEditNote(note: CaseNoteRecord)");
    expect(workflow).not.toContain("async function saveNote(event: FormEvent<HTMLFormElement>)");
    expect(workflow).not.toContain("const [editingNote, setEditingNote]");
  });

  it("keeps the note modal wired to editor outputs", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("editingNote={editingNote}");
    expect(workflow).toContain("onSubmit={saveNote}");
    expect(workflow).toContain("onToggleLinkedCase={toggleLinkedCase}");
    expect(workflow).toContain("onProtocolTextChange={inlineCommands.handleProtocolTextChange}");
  });
});
