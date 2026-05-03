import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("template management edit and delete", () => {
  it("does not offer draft generation on the template administration page", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).not.toContain("Entwurf erzeugen");
    expect(app).not.toContain("Erzeugter Entwurf");
    expect(app).not.toContain("In Zwischenablage kopieren</button>");
  });

  it("offers edit and delete actions for existing templates", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("openEditTemplate");
    expect(app).toContain("saveEditedTemplate");
    expect(app).toContain("deleteTemplate");
    expect(app).toContain("template-trash-button");
    expect(app).toContain("Vorlage bearbeiten");
  });

  it("styles the template management list and metadata", () => {
    const css = readFileSync("src/app/templateWorkbench.css", "utf8");
    expect(css).toContain(".template-list-row");
    expect(css).toContain(".template-trash-button");
    expect(css).toContain(".template-detail-meta");
  });
});
