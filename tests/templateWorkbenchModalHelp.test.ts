import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("template workbench modal and help", () => {
  it("opens template creation through a modal instead of a permanent page form", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("isCreateTemplateModalOpen");
    expect(app).toContain("setIsCreateTemplateModalOpen(true)");
    expect(app).toContain("template-create-modal");
    expect(app).not.toContain('<section className="industrial-panel">\n        <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Eigene Vorlage</p><h2>Vorlage ergänzen</h2></div></div>');
  });

  it("contains a placeholder help overlay reachable from the catalog header", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("isTemplateHelpOpen");
    expect(app).toContain("template-help-button");
    expect(app).toContain("template-placeholder-help");
    expect(app).toContain("{{fall.aktenzeichen}}");
    expect(app).toContain("{{praevention.status}}");
  });

  it("loads template workbench styles", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const css = readFileSync("src/app/templateWorkbench.css", "utf8");
    expect(app).toContain("import './templateWorkbench.css';");
    expect(css).toContain(".template-filter-form");
    expect(css).toContain(".template-create-modal");
    expect(css).toContain(".template-help-modal");
  });
});
