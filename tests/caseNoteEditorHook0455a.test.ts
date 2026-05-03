import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.55a useCaseNoteEditor build fix", () => {
  it("does not pass setNoteError before the note editor hook exists", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("const [caseLoadError, setCaseLoadError] = useState('');");
    expect(workflow).toContain("onError: setCaseLoadError");
    expect(workflow).not.toContain("onError: setNoteError");
  });

  it("bridges case load errors into the note editor error state after hook initialization", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("if (caseLoadError) setNoteError(caseLoadError);");
  });

  it("does not call a removed local resetNoteForm function", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).not.toContain("function resetNoteForm()");
    expect(workflow).toContain("noteEditor.resetNoteForm();");
  });
});
