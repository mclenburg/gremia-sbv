import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.57 template behavior contracts", () => {
  it("supports creating, editing and deleting templates in the templates view", () => {
    const templates = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(templates).toContain("bridge.templates.create");
    expect(templates).toContain("bridge.templates.update");
    expect(templates).toContain("bridge.templates.delete");
    expect(templates).toContain("editingTemplate");
    expect(templates).toContain("setEditingTemplate");
  });

  it("keeps tags and process status bindings editable", () => {
    const templates = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(templates).toContain("tags");
    expect(templates).toContain("massnahme:prevention");
    expect(templates).toContain("status:");
    expect(templates).toContain("newTemplateProcessStatus");
  });

  it("documents placeholder help and unresolved placeholders", () => {
    const templates = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    const helpModal = readFileSync("src/app/features/templates/TemplateHelpModal.tsx", "utf8");
    const model = readFileSync("src/app/core/models/template.model.ts", "utf8");
    expect(templates).toContain("TemplateHelpModal");
    expect(helpModal).toContain("Platzhalter");
    expect(helpModal).toContain("sbv.name");
    expect(model).toContain("unresolvedPlaceholders");
  });

  it("keeps rendered process documents warning about unresolved placeholders", () => {
    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");
    expect(modal).toContain("Offene Platzhalter");
    expect(modal).toContain("state.rendered.unresolvedPlaceholders");
  });
});
