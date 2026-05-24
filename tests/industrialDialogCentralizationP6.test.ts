import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
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

describe("Dialog-Zentralisierung Patch P6", () => {
  it("stellt zentrale Modal- und Fachdialog-Komponenten mit Fokus- und ESC-Verhalten bereit", () => {
    const dialogs = source("src/app/shared/dialogs/IndustrialDialogs.tsx");
    const feedback = source("src/app/shared/components/ImportExportFeedback.tsx");
    const css = source("src/app/ui/responsiveDesign.css");

    for (const component of [
      "IndustrialModal",
      "ConfirmDialog",
      "DestructiveConfirmDialog",
      "PassphraseDialog",
      "ExportResultDialog",
      "ReasonRequiredDialog",
    ]) {
      expect(dialogs).toContain(`function ${component}`);
    }

    expect(dialogs).toContain('role="alertdialog"');
    expect(dialogs).toContain('aria-modal="true"');
    expect(dialogs).toContain('event.key === "Escape"');
    expect(dialogs).toContain('event.key !== "Tab"');
    expect(dialogs).toContain('previousActiveElement?.focus()');
    expect(feedback).toContain('aria-live="polite"');

    for (const selector of [
      ".industrial-modal-warning",
      ".industrial-modal-danger",
      ".industrial-confirm-dialog",
      ".industrial-export-result",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("zieht den globalen Confirm-Provider auf den zentralen ConfirmDialog", () => {
    const provider = source("src/app/shared/dialogs/ConfirmDialogProvider.tsx");

    expect(provider).toContain("ConfirmDialog");
    expect(provider).not.toContain("document.addEventListener('keydown'");
    expect(provider).not.toContain("industrial-confirm-backdrop");
    expect(provider).not.toContain("industrial-danger-button");
  });

  it("zentralisiert Passphrase- und Exportfeedback der Fallübergabe", () => {
    const handover = source("src/app/features/cases/CaseHandoverTransferDialogs.tsx");
    const tags = jsxTagNames("src/app/features/cases/CaseHandoverTransferDialogs.tsx");

    expect(handover).toContain("IndustrialModal");
    expect(handover).toContain("ExportResultDialog");
    expect(handover).toContain("PasswordInput");
    expect(handover).toContain("Der Speicherort bleibt sichtbares Nutzerfeedback");
    expect(handover).toContain("role=\"alert\"");

    expect(tags).not.toContain("button");
    expect(handover).not.toContain('role="dialog" aria-modal="true"');
    expect(handover).not.toContain("industrial-modal-backdrop");
  });

  it("erhält Textarea-Kurzbefehle nach der Formularzentralisierung", () => {
    const form = source("src/app/shared/components/IndustrialForm.tsx");

    expect(form).toContain("TextCommandTextarea");
    expect(form).toContain("fieldId={textCommandFieldId ?? id}");
    expect(form).toContain("showCommandHint={showCommandHint}");
    expect(form).toContain("globalCommandsEnabled={globalCommandsEnabled}");
  });
});
