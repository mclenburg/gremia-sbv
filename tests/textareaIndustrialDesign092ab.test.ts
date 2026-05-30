import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readNormalizedSourceText } from "./helpers/sourceText";

const readCss = (...segments: string[]) =>
  readNormalizedSourceText(join(process.cwd(), ...segments));

const formsCss = () => readCss("src", "app", "ui", "forms.css");
const modalCss = () => readCss("src", "app", "ui", "modal.css");
const uiCss = () =>
  [
    readCss("src", "app", "ui", "designTokens.css"),
    readCss("src", "app", "ui", "base.css"),
    readCss("src", "app", "ui", "appShell.css"),
    readCss("src", "app", "ui", "components.css"),
    modalCss(),
    readCss("src", "app", "ui", "workbench.css"),
    readCss("src", "app", "ui", "processes.css"),
    readCss("src", "app", "ui", "featureModules.css"),
    readCss("src", "app", "ui", "responsiveDesign.css"),
    formsCss(),
  ].join("\n");

describe("Industrial-Textarea-Design", () => {
  it("gestaltet große Textfelder in Industrial-Formularen nicht mit Browser-Grau", () => {
    const css = formsCss();

    expect(css).toContain(".industrial-textarea-input");
    expect(css).toContain(".industrial-field textarea");
    expect(css).toContain("border: 1px solid var(--industrial-control-border)");
    expect(css).toContain("background: var(--industrial-control-bg)");
    expect(css).toContain("color: var(--industrial-control-text)");
    expect(css).toContain("resize: vertical");
    expect(css).toContain("::placeholder");
    expect(css).not.toMatch(/textarea[^{}]*\{[^}]*background:\s*(?:ButtonFace|Field|white|#fff|transparent)\b/i);
  });

  it("zieht Textareas in Modalen und im Light-Mode in den zentralen Formularvertrag", () => {
    const css = uiCss();

    expect(formsCss()).toContain(".industrial-modal-grid textarea");
    expect(css).toContain("html[data-theme='light'] .industrial-modal-grid textarea");
    expect(css).toContain("html[data-theme='light'] .industrial-textarea-input");
    expect(css).toContain("background: #fbfaf2");
    expect(css).toContain("color: var(--text-primary)");
    expect(modalCss()).toContain(".industrial-modal-grid");
    expect(modalCss()).toContain("overflow-y: auto");
  });
});
