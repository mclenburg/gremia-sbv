import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.1b equalization and pagination build fix", () => {
  it("declares the case register pagination state used by the table", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("const [caseRegisterPage, setCaseRegisterPage] = useState(1)");
    expect(workflow).toContain("const caseRegisterPageSize = 5");
    expect(workflow).toContain("onPageChange={setCaseRegisterPage}");
  });

  it("allows equalization process template modal state", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");

    expect(modal).toContain("process: PreventionProcessRecord | BemProcessRecord | EqualizationProcessRecord");
    expect(modal).toContain("processType: 'prevention' | 'bem' | 'equalization'");
    expect(workflow).toContain("processType === 'equalization' ? 'gleichstellung' : 'praevention'");
    expect(workflow).toContain("openProcessTemplateModal(process: PreventionProcessRecord | BemProcessRecord | EqualizationProcessRecord)");
    expect(workflow).toContain("EqualizationProcessRecord");
  });
});
