import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.47a case workbench data hook fix", () => {
  it("keeps legal norm linking in the inline command hook", () => {
    const hook = readFileSync("src/app/features/cases/inlineCommands/useInlineCommands.ts", "utf8");
    expect(hook).toContain("setCaseLegalReferences");
    expect(hook).toContain("bridge.knowledge.listCaseReferences(selectedCaseId)");
  });

  it("keeps a local selectedCaseId for retention case actions", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const panelStart = workflow.indexOf("function RetentionSettingsPanel");
    const panelEnd = workflow.indexOf("async function reloadRetention", panelStart);
    const panelState = workflow.slice(panelStart, panelEnd);
    expect(panelState).toContain("const [selectedCaseId, setSelectedCaseId] = useState('');");
  });
});
