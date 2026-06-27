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
  it("setzt Auth und Recovery auf zentrale Button-Komponenten statt nativer Feature-Buttons", () => {
    const auth = featureSources("src/app/features/auth");

    expect(auth).toContain("IndustrialButton");
    const nativeButtons = tsxFilesUnder("src/app/features/auth").flatMap(nativeButtonLocations);
    expect(nativeButtons).toEqual([]);
  });
  it("deckt native Feature-Buttons ueber alle Feature-Module als explizite Architekturschuld ab", () => {
    const allowedNativeButtonCounts: Record<string, number> = {
      "src/app/features/cases/CaseCreateModal.tsx": 3,
      "src/app/features/cases/CaseDetailPanel.tsx": 1,
      "src/app/features/cases/CaseDocumentDetail.tsx": 3,
      "src/app/features/cases/CaseNoteEntityLinks.tsx": 1,
      "src/app/features/cases/CaseNoteModal.tsx": 2,
      "src/app/features/cases/CaseProcessDraftModal.tsx": 2,
      "src/app/features/cases/CaseRegister.tsx": 5,
      "src/app/features/cases/CaseTreePanel.tsx": 9,
      "src/app/features/cases/CaseWorkbenchFooter.tsx": 1,
      "src/app/features/cases/CasesViewRender.tsx": 3,
      "src/app/features/cases/ContextualTemplateButton.tsx": 3,
      "src/app/features/cases/LegacyCaseBindingDialog.tsx": 2,
      "src/app/features/cases/ProcessTemplateDocumentsModal.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineAnonymizationOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineBemOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineCaseLinkOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineConfidentialityOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineContactOverlay.tsx": 3,
      "src/app/features/cases/inlineCommands/overlays/InlineDeadlineOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineEqualizationOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineLegalNormOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineOpenTaskOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineParticipationOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlinePreventionOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineRiskOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineTemplateOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineTerminationOverlay.tsx": 2,
      "src/app/features/cases/inlineCommands/overlays/InlineWorkplaceAccommodationOverlay.tsx": 2,
      "src/app/features/cases/measures/MeasureNoteCard.tsx": 2,
      "src/app/features/cases/measures/MeasureNoteForm.tsx": 2,
      "src/app/features/cases/measures/MeasureNotesPanel.tsx": 1,
      "src/app/features/dashboard/DashboardFocusOverview.tsx": 3,
      "src/app/features/persons/PersonCaseCreateDialog.tsx": 2,
      "src/app/features/persons/PersonEditDialog.tsx": 2,
      "src/app/features/persons/PersonExpiryDashboardCard.tsx": 2,
      "src/app/features/persons/PersonForm.tsx": 2,
      "src/app/features/persons/PersonImportWizard.tsx": 11,
      "src/app/features/persons/PersonLifecycleReviewDialog.tsx": 4,
      "src/app/features/persons/PersonList.tsx": 1,
      "src/app/features/persons/PersonPrivacyActionDialog.tsx": 2,
      "src/app/features/persons/PersonToolbar.tsx": 3,
      "src/app/features/settings/ChangePasswordForm.tsx": 1,
      "src/app/features/settings/RetentionSettingsPanel.tsx": 4,
      "src/app/features/settings/TemplateDefaultSettingsForm.tsx": 1,
      "src/app/features/settings/TemporaryFilesSettingsPanel.tsx": 1,
      "src/app/features/settings/ThemeSettingsForm.tsx": 2,
    };

    const actualNativeButtonCounts = Object.fromEntries(
      tsxFilesUnder("src/app/features")
        .map((file) => [file, nativeButtonLocations(file).length] as const)
        .filter(([, count]) => count > 0),
    );

    expect(actualNativeButtonCounts).toEqual(allowedNativeButtonCounts);
  });

});
