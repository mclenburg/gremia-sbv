import { readFileSync } from "node:fs";
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

function jsxTagNames(path: string): string[] {
  const text = source(path);
  const ast = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const tags: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && ts.isIdentifier(node.tagName)) {
      tags.push(node.tagName.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(ast);
  return tags;
}

describe("Export-/Import-Feedback-Zentralisierung Patch P8", () => {
  it("stellt zentrale Bausteine für Exportaktion, Speicherort und Importprüfung bereit", () => {
    const feedback = source("src/app/shared/components/ImportExportFeedback.tsx");
    const css = uiCss();

    for (const component of [
      "ExportAction",
      "FileLocationNotice",
      "ImportPackageReview",
    ]) {
      expect(feedback).toContain(`function ${component}`);
    }

    expect(feedback).toContain('role="status"');
    expect(feedback).toContain('aria-live="polite"');
    expect(feedback).toContain('Mit bestehender Fallakte zusammenführen/aktualisieren');

    for (const selector of [
      ".industrial-export-action",
      ".industrial-file-location-notice",
      ".industrial-import-package-review",
      ".industrial-import-package-options",
      ".industrial-import-package-target",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("nutzt die zentralen Feedbackbausteine in der Fallübergabe", () => {
    const handover = source("src/app/features/cases/CaseHandoverTransferDialogs.tsx");
    const tags = jsxTagNames("src/app/features/cases/CaseHandoverTransferDialogs.tsx");

    expect(handover).toContain("ExportAction");
    expect(handover).toContain("ImportPackageReview");
    expect(handover).toContain("ExportResultDialog");
    expect(handover).toContain("onInspectImport(importFile.filePath, importPassphrase)");

    expect(tags).not.toContain("button");
    expect(handover).not.toContain("case-handover-import-options");
    expect(handover).not.toContain("case-handover-import-preview");
  });

  it("entfernt die alte lokale ConfirmDialog-CSS-Datei über den bestehenden Cleanup", () => {
    const app = source("src/app/App.tsx");
    const cleanup = source("maintenance/source-cleanup/obsolete-confirm-dialog-css-p6.json");

    expect(app).not.toContain('import "./confirmDialog.css"');
    expect(cleanup).toContain("src/app/confirmDialog.css");
  });
});
