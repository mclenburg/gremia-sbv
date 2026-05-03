import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.57 Fallakte behavior contracts", () => {
  it("loads all child data for a selected case", () => {
    const hook = readFileSync("src/app/features/cases/useCaseWorkbenchData.ts", "utf8");

    expect(hook).toContain("bridge.cases.listNotes(selectedCaseId)");
    expect(hook).toContain("bridge.cases.listDocuments(selectedCaseId)");
    expect(hook).toContain("bridge.knowledge?.listCaseReferences(selectedCaseId)");
    expect(hook).toContain("bridge.prevention?.list(selectedCaseId)");
    expect(hook).toContain("reloadSelectedCaseChildren");
  });

  it("opens deep-linked case nodes instead of falling back to overview", () => {
    const hook = readFileSync("src/app/features/cases/useCaseWorkbenchData.ts", "utf8");

    expect(hook).toContain("pendingCaseNodeTarget");
    expect(hook).toContain("nodeType === 'prevention'");
    expect(hook).toContain("setSelection({ type: 'process', processType: 'prevention'");
    expect(hook).toContain("nodeType === 'note'");
    expect(hook).toContain("nodeType === 'document'");
    expect(hook).toContain("onTargetConsumed?.()");
  });

  it("creates and updates notes through the note editor hook", () => {
    const hook = readFileSync("src/app/features/cases/useCaseNoteEditor.ts", "utf8");

    expect(hook).toContain("bridge.cases.updateNote(editingNote.id, payload)");
    expect(hook).toContain("bridge.cases.createNote(payload)");
    expect(hook).toContain("await reloadSelectedCaseChildren()");
    expect(hook).toContain("setSelection({ type: 'note', id: saved.id })");
    expect(hook).toContain("if (searchQuery.trim()) await runSearch()");
  });

  it("keeps the currently selected case as mandatory note relation", () => {
    const hook = readFileSync("src/app/features/cases/useCaseNoteEditor.ts", "utf8");

    expect(hook).toContain("const normalizedLinkedCaseIds = [...new Set([selectedCaseId, ...linkedCaseIds].filter(Boolean))]");
    expect(hook).toContain("setLinkedCaseIds(selectedCaseId ? [selectedCaseId] : [])");
  });
});
