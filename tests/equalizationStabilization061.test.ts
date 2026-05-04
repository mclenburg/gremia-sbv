import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.1 Gleichstellung/GdB stabilization", () => {
  it("removes duplicated process overview title/description rendering", () => {
    const processOverview = readFileSync("src/app/shared/process/ProcessOverview.tsx", "utf8");

    expect(processOverview).not.toContain("<h2>{title}</h2>");
    expect(processOverview).not.toContain("<p>{description}</p>");
    expect(processOverview).toContain("process-overview-topline-actions");
  });

  it("keeps the equalization module active and removes development placeholder state", () => {
    const modules = readFileSync("src/app/core/navigation/modules.ts", "utf8");

    const equalizationBlock = modules.slice(modules.indexOf("id: 'equalization'"), modules.indexOf("id: 'termination'", modules.indexOf("id: 'equalization'")));

    expect(equalizationBlock).toContain("title: 'Gleichstellung / GdB'");
    expect(equalizationBlock).not.toContain("plannedVersion");
    expect(equalizationBlock).not.toContain("status: 'planned'");
  });

  it("adds equalization guidance and template access in the case detail", () => {
    const detail = readFileSync("src/app/features/equalization/EqualizationProcessDetail.tsx", "utf8");
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(detail).toContain("buildEqualizationGuidance");
    expect(detail).toContain("equalization-guidance-panel");
    expect(detail).toContain("Status vorschlagen");
    expect(workflow).toContain("onOpenTemplates={openProcessTemplateModal}");
    expect(workflow).toContain("processType: isBemProcessRecord(process) ? 'bem' : (isEqualizationProcessRecord(process) ? 'equalization' : 'prevention')");
  });
});
