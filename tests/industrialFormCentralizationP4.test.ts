import { readdirSync, readFileSync, statSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

function uiCss(): string {
  return [
    'src/app/ui/designTokens.css',
    'src/app/ui/base.css',
    'src/app/ui/appShell.css',
    'src/app/ui/components.css',
  'src/app/ui/modal.css',
    'src/app/ui/workbench.css',
    'src/app/ui/processes.css',
    'src/app/ui/featureModules.css',
    'src/app/ui/responsiveDesign.css',
    'src/app/ui/forms.css',

  ].map((file) => source(file)).join('\n');
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

function tsxFilesUnder(dir: string): string[] {
  const files: string[] = [];
  function visit(path: string) {
    for (const entry of readdirSync(path)) {
      const child = `${path}/${entry}`;
      if (statSync(child).isDirectory()) {
        visit(child);
      } else if (child.endsWith(".tsx")) {
        files.push(child);
      }
    }
  }
  visit(dir);
  return files;
}

type JsxTagFinding = { tag: string; line: number; character: number };

function nativeFormControlLocations(path: string): JsxTagFinding[] {
  const text = source(path);
  const ast = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const locations: JsxTagFinding[] = [];

  function hasReadOnlyAttribute(node: ts.JsxOpeningElement): boolean {
    return node.attributes.properties.some(
      (attribute) =>
        ts.isJsxAttribute(attribute) &&
        ts.isIdentifier(attribute.name) &&
        attribute.name.text === "readOnly",
    );
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && ts.isIdentifier(node.tagName)) {
      const tag = node.tagName.text;
      if (["input", "select", "label"].includes(tag)) {
        const { line, character } = ast.getLineAndCharacterOfPosition(
          node.getStart(ast),
        );
        locations.push({ tag, line: line + 1, character: character + 1 });
      }
      if (tag === "textarea" && !hasReadOnlyAttribute(node)) {
        const { line, character } = ast.getLineAndCharacterOfPosition(
          node.getStart(ast),
        );
        locations.push({ tag, line: line + 1, character: character + 1 });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(ast);
  return locations;
}

describe("Formular-Zentralisierung Patch P4", () => {
  it("stellt zentrale Formularbausteine mit a11y-Verkettung bereit", () => {
    const form = source("src/app/shared/components/IndustrialForm.tsx");
    const css = uiCss();

    for (const component of [
      "FormSection",
      "FormField",
      "TextInput",
      "TextareaInput",
      "SelectInput",
      "DateInput",
      "PasswordInput",
      "FormActions",
    ]) {
      expect(form).toContain(`function ${component}`);
    }

    expect(form).toContain("aria-describedby={describedBy}");
    expect(form).toContain("aria-invalid={invalid ? \"true\" : undefined}");
    expect(form).toContain('role="alert"');
    expect(form).toContain("aria-required={required ? \"true\" : undefined}");

    for (const selector of [
      ".industrial-form-section",
      ".industrial-field-label",
      ".industrial-field-help",
      ".industrial-field-error",
      ".industrial-field-invalid",
      ".industrial-checkbox-field",
      ".industrial-form-actions",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("setzt Compliance-Formulare auf zentrale Komponenten und sperrt fehlerhafte Pflichtfelder negativ ab", () => {
    const compliance = featureSources("src/app/features/compliance");

    expect(compliance).toContain("FormSection");
    expect(compliance).toContain("DateTimeInput");
    expect(compliance).toContain("DateInput");
    expect(compliance).toContain("SelectInput");
    expect(compliance).toContain("TextareaInput");
    expect(compliance).toContain("CheckboxField");
    expect(compliance).toContain('disabled={!input.summary.trim()}');
    expect(compliance).toContain("Kurzbeschreibung ist erforderlich.");
    expect(compliance).toContain("Name ist für die Auskunftsantwort erforderlich.");

    const nativeControls = tsxFilesUnder("src/app/features/compliance").flatMap(nativeFormControlLocations);
    expect(nativeControls).toEqual([]);
  });

  it("setzt das SBV-Ressourcenformular auf zentrale Komponenten und blockiert leere Nachweistitel", () => {
    const sbvControl = featureSources("src/app/features/sbv-control");
    const resourceForm = source("src/app/features/sbv-control/components/ResourceForm.tsx");

    expect(resourceForm).toContain("SelectInput");
    expect(resourceForm).toContain("DateInput");
    expect(resourceForm).toContain("TextareaInput");
    expect(resourceForm).toContain("FormActions");
    expect(resourceForm).toContain('disabled={!resourceForm.title?.trim()}');
    expect(sbvControl).toContain("Titel ist für den Nachweis erforderlich.");

    const nativeControls = tsxFilesUnder("src/app/features/sbv-control").flatMap(nativeFormControlLocations);
    expect(nativeControls).toEqual([]);
  });
});
