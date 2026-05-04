import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.1c equalization template status fix", () => {
  it("renders process-template modal labels without assuming a .status field", () => {
    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");

    expect(modal).toContain("processTemplateProcessLabel");
    expect(modal).toContain("processTemplateStatusLabel");
    expect(modal).toContain("processTemplateStatusTag");
    expect(modal).toContain("state.process.applicationStatus");
    expect(modal).not.toContain("processTypeLabel(state.processType)");
    expect(modal).not.toContain("status:${state.process.status}");
  });

  it("filters process templates with the correct status field for equalization", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("const status = isEqualizationProcessRecord(process) ? process.applicationStatus : process.status");
    expect(workflow).toContain("isTemplateConnectedToProcessStatus(template, processType, status)");
    expect(workflow).not.toContain("isTemplateConnectedToProcessStatus(template, processType, process.status)");
  });

  it("uses derived status for BEM/equalization export scanning", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("status: isEqualizationProcessRecord(processTemplateModal.process) ? processTemplateModal.process.applicationStatus : processTemplateModal.process.status");
  });
});
