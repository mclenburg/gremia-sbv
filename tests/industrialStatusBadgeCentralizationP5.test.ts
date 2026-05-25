import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  complianceFindingToTone,
  deadlineStateToTone,
  deadlineToTone,
  processStatusToTone,
  riskLevelToTone,
} from "../src/app/shared/status/statusTone";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

function sourcesUnder(dir: string): string {
  const chunks: string[] = [];
  function visit(path: string) {
    for (const entry of readdirSync(path)) {
      const child = `${path}/${entry}`;
      if (statSync(child).isDirectory()) {
        visit(child);
        continue;
      }
      if (child.endsWith(".ts") || child.endsWith(".tsx")) {
        chunks.push(source(child));
      }
    }
  }
  visit(dir);
  return chunks.join("\n");
}

describe("Status-/Badge-Zentralisierung Patch P5", () => {
  it("stellt zentrale Badge-Komponenten und Mapper bereit", () => {
    const badges = source("src/app/shared/components/StatusBadges.tsx");
    const mappers = source("src/app/shared/status/statusTone.ts");
    const css = source("src/app/ui/responsiveDesign.css");

    for (const component of [
      "StatusBadge",
      "RiskBadge",
      "DeadlineBadge",
      "ComplianceBadge",
      "ProcessStatusBadge",
    ]) {
      expect(badges).toContain(`function ${component}`);
    }

    for (const mapper of [
      "riskLevelToTone",
      "deadlineToTone",
      "deadlineStateToTone",
      "processStatusToTone",
      "complianceFindingToTone",
    ]) {
      expect(mappers).toContain(`function ${mapper}`);
    }

    for (const selector of [
      ".industrial-status-badge",
      ".industrial-status-badge-ok",
      ".industrial-status-badge-warning",
      ".industrial-status-badge-danger",
      ".industrial-status-badge-info",
      ".industrial-status-badge-muted",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("mappt Risiko-, Compliance-, Prozess- und Fristentöne positiv und negativ", () => {
    expect(riskLevelToTone("high")).toBe("danger");
    expect(riskLevelToTone("medium")).toBe("warning");
    expect(riskLevelToTone("low")).toBe("ok");
    expect(riskLevelToTone("nicht-bekannt")).toBe("default");

    expect(complianceFindingToTone("problem")).toBe("danger");
    expect(complianceFindingToTone("warning")).toBe("warning");
    expect(complianceFindingToTone("ok")).toBe("ok");
    expect(complianceFindingToTone("archiviert")).toBe("default");

    expect(processStatusToTone("closed")).toBe("ok");
    expect(processStatusToTone("in_review")).toBe("warning");
    expect(processStatusToTone("rejected")).toBe("danger");
    expect(processStatusToTone("suspended")).toBe("muted");
    expect(processStatusToTone("frei-text")).toBe("default");

    expect(deadlineStateToTone("overdue")).toBe("danger");
    expect(deadlineStateToTone("due_soon")).toBe("warning");
    expect(deadlineStateToTone("done")).toBe("ok");
    expect(deadlineStateToTone("hidden")).toBe("muted");
    expect(deadlineStateToTone("frei-text")).toBe("default");

    const today = new Date("2026-05-24T10:00:00.000Z");
    expect(deadlineToTone("2026-05-23T10:00:00.000Z", today)).toBe("danger");
    expect(deadlineToTone("2026-05-25T10:00:00.000Z", today)).toBe("warning");
    expect(deadlineToTone("2026-06-01T10:00:00.000Z", today)).toBe("info");
    expect(deadlineToTone("kein-datum", today)).toBe("default");
  });

  it("zieht Compliance, SBV-Steuerung und Fristenanzeigen auf zentrale Badge-Komponenten", () => {
    const compliance = sourcesUnder("src/app/features/compliance");
    const sbvControl = sourcesUnder("src/app/features/sbv-control");
    const deadlines = source("src/app/features/deadlines/DeadlineBadge.tsx");

    expect(compliance).toContain("ComplianceBadge");
    expect(compliance).toContain("RiskBadge");
    expect(compliance).toContain("ProcessStatusBadge");
    expect(compliance).not.toContain("industrial-tag-${incident.riskLevel");
    expect(compliance).not.toContain("industrial-tag-${result.status");

    expect(sbvControl).toContain("ProcessStatusBadge");
    expect(sbvControl).toContain("RiskBadge");
    expect(sbvControl).toContain("riskLevelToTone");
    expect(sbvControl).not.toContain("function controlTone");

    expect(deadlines).toContain("DeadlineBadge");
    expect(deadlines).toContain("RiskBadge");
    expect(deadlines).not.toContain("industrial-status-danger");
    expect(deadlines).not.toContain("severityClass");
  });
});
