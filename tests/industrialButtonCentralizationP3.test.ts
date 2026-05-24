import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
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
    const css = source("src/app/ui/responsiveDesign.css");

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
    const compliance = source("src/app/features/compliance/ComplianceView.tsx");

    expect(compliance).toContain("IndustrialButton");
    expect(compliance).toContain("ToolbarButton");
    expect(compliance).toContain("ButtonGroup");
    expect(nativeButtonLocations("src/app/features/compliance/ComplianceView.tsx")).toEqual([]);
  });

  it("setzt die SBV-Steuerung auf zentrale Button-Komponenten statt nativer Feature-Buttons", () => {
    const sbvControl = source("src/app/features/sbv-control/SbvControlView.tsx");

    expect(sbvControl).toContain("IndustrialButton");
    expect(sbvControl).toContain("ToolbarButton");
    expect(sbvControl).toContain("GhostButton");
    expect(sbvControl).toContain("DangerButton");
    expect(nativeButtonLocations("src/app/features/sbv-control/SbvControlView.tsx")).toEqual([]);
  });
});
