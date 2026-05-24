import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

function featureSources(dir: string): string {
  const chunks: string[] = [];
  function visit(path: string) {
    for (const entry of readdirSync(path)) {
      const child = `${path}/${entry}`;
      if (statSync(child).isDirectory()) {
        visit(child);
      } else if (child.endsWith(".ts") || child.endsWith(".tsx")) {
        chunks.push(source(child));
      }
    }
  }
  visit(dir);
  return chunks.join("\n");
}

describe("Panel-/Card-Zentralisierung Patch P2", () => {
  it("stellt zentrale Industrial-Panel- und Card-Komponenten bereit", () => {
    const layout = source("src/app/shared/components/WorkbenchLayout.tsx");
    const css = source("src/app/ui/responsiveDesign.css");

    for (const component of [
      "IndustrialPanel",
      "IndustrialRecordCard",
      "IndustrialSelectionCard",
      "IndustrialStatusCard",
      "IndustrialWarningPanel",
      "IndustrialDangerPanel",
    ]) {
      expect(layout).toContain(`function ${component}`);
    }

    for (const selector of [
      ".industrial-record-card",
      ".industrial-selection-card",
      ".industrial-status-card",
      ".industrial-warning-panel",
      ".industrial-danger-panel",
      ".industrial-tone-warning",
      ".industrial-tone-danger",
      ".industrial-tone-ok",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("nutzt in Compliance zentrale Status- und Auswahlkarten statt lokaler JSX-Nachbauten", () => {
    const compliance = source("src/app/features/compliance/ComplianceView.tsx");

    expect(compliance).toContain("IndustrialStatusCard");
    expect(compliance).toContain("IndustrialSelectionCard");
    expect(compliance).not.toContain("className={`industrial-status-card");
    expect(compliance).not.toContain("className={`industrial-selection-card");
  });

  it("zieht SBV-Steuerung auf zentrale Panels und Record-/Selection-Cards", () => {
    const sbvControl = featureSources("src/app/features/sbv-control");

    expect(sbvControl).toContain("IndustrialPanel");
    expect(sbvControl).toContain("IndustrialRecordCard");
    expect(sbvControl).toContain("IndustrialSelectionCard");
    expect(sbvControl).not.toContain('<div className="sbv-control-panel"');
    expect(sbvControl).not.toContain(
      '<article key={topic.id} className="sbv-control-mini-card"',
    );
  });
});
