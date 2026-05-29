import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("template management edit and delete", () => {
  it("does not offer draft generation on the template administration page", () => {
    const view = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    expect(view).not.toContain("Entwurf erzeugen");
    expect(view).not.toContain("Erzeugter Entwurf");
    expect(view).not.toContain("In Zwischenablage kopieren</button>");
  });

  it("offers edit and delete actions for existing templates", () => {
    const view = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");
    const catalogPanels = readFileSync("src/app/features/templates/TemplateCatalogPanels.tsx", "utf8");
    const editorModal = readFileSync("src/app/features/templates/TemplateEditorModal.tsx", "utf8");
    expect(view).toContain("openEditTemplate");
    expect(view).toContain("saveEditedTemplate");
    expect(view).toContain("deleteTemplate");
    expect(catalogPanels).toContain("template-trash-button");
    expect(editorModal).toContain("Vorlage bearbeiten");
  });
});
