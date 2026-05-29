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

function nativeButtonLocations(path: string): string[] {
  const text = source(path);
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const locations: string[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isJsxOpeningElement(node) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === "button"
    ) {
      const { line, character } = ast.getLineAndCharacterOfPosition(node.getStart(ast));
      locations.push(`${path}:${line + 1}:${character + 1}`);
    }
    ts.forEachChild(node, visit);
  }

  visit(ast);
  return locations;
}

describe("Button-Zentralisierung Patch P3", () => {
  it("stellt die zentrale Industrial-Button-Familie bereit", () => {
    const buttons = source("src/app/shared/components/IndustrialButton.tsx");
    const css = uiCss();

    for (const component of [
      "IndustrialButton",
      "ToolbarButton",
      "DangerButton",
      "GhostButton",
      "IconButton",
      "ButtonGroup",
    ]) {
      expect(buttons).toContain(`function ${component}`);
    }

    for (const selector of [
      ".industrial-button-group",
      ".industrial-ghost-button",
      ".industrial-button-loading",
      ".industrial-button-spinner",
      ".industrial-icon-button:focus-visible",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("setzt Compliance auf zentrale Button-Komponenten statt nativer Feature-Buttons", () => {
    const compliance = featureSources("src/app/features/compliance");

    expect(compliance).toContain("IndustrialButton");
    expect(compliance).toContain("ToolbarButton");
    expect(compliance).toContain("ButtonGroup");
    const nativeButtons = tsxFilesUnder("src/app/features/compliance").flatMap(nativeButtonLocations);
    expect(nativeButtons).toEqual([]);
  });

  it("setzt die SBV-Steuerung auf zentrale Button-Komponenten statt nativer Feature-Buttons", () => {
    const sbvControl = featureSources("src/app/features/sbv-control");

    expect(sbvControl).toContain("IndustrialButton");
    expect(sbvControl).toContain("ToolbarButton");
    expect(sbvControl).toContain("GhostButton");
    expect(sbvControl).toContain("DangerButton");
    const nativeButtons = tsxFilesUnder("src/app/features/sbv-control").flatMap(nativeButtonLocations);
    expect(nativeButtons).toEqual([]);
  });
});
