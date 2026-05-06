import { waitForBridge } from "../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "./caseWorkbenchFormat";
import type { FormEvent } from "react";
import type { CaseNoteRecord } from "../../core/models/case-note.model";
import type { CaseDocumentRecord } from "../../core/models/case-document.model";
import type { TemplateRecord, RenderedTemplateResult } from "../../core/models/template.model";
import type { SetStateAction } from "react";
import type { PreventionProcessRecord } from "../../core/models/prevention.model";
import type { BemProcessRecord } from "../../core/models/bem.model";
import type { EqualizationProcessRecord } from "../../core/models/equalization.model";
import type { TerminationHearingRecord } from "../../core/models/termination.model";
import type { ProcessTemplateModalState } from "./ProcessTemplateDocumentsModal";
import { buildExportWarningMessage, scanBemProcessExport, scanSensitiveExportText } from "@services/exportGuardPolicy";
import { buildTerminationExportContext, terminationPrivacyExportNotice } from "@services/terminationPrivacyPolicy";
import { buildProcessTemplateValues, defaultCaseProcessDraft, downloadRenderedTemplate, isBemProcessRecord, isEqualizationProcessRecord, isTemplateConnectedToProcessStatus, isTerminationHearingRecord, loadTemplateDefaultValues } from "./casesViewProcessUtils";

type ProcessTemplateModalSetter = (
  next:
    | ProcessTemplateModalState
    | null
    | ((current: ProcessTemplateModalState | null) => ProcessTemplateModalState | null),
) => void;

type useProcessTemplateActionsDeps = {
  processTemplateModal: ProcessTemplateModalState | null;
  setProcessTemplateModal: ProcessTemplateModalSetter;
  selectedCase: any;
  confirmDialog: any;
};

export function useProcessTemplateActions(deps: useProcessTemplateActionsDeps) {
  const { processTemplateModal, setProcessTemplateModal, selectedCase, confirmDialog } = deps;
  async function openProcessTemplateModal(
    process:
      | PreventionProcessRecord
      | BemProcessRecord
      | EqualizationProcessRecord
      | TerminationHearingRecord,
  ) {
    const processType = isBemProcessRecord(process)
      ? "bem"
      : isEqualizationProcessRecord(process)
        ? "equalization"
        : isTerminationHearingRecord(process)
          ? "termination_hearing"
          : "prevention";
    const category =
      processType === "bem"
        ? "bem"
        : processType === "equalization"
          ? "gleichstellung"
          : processType === "termination_hearing"
            ? "kuendigung"
            : "praevention";
    const status = isEqualizationProcessRecord(process)
      ? process.applicationStatus
      : process.status;
    setProcessTemplateModal({
      process,
      processType,
      templates: [],
      loading: true,
    });
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates)
        throw new Error("Vorlagendienst ist nicht erreichbar.");
      const rows = await bridge.templates.list({ category, limit: 500 });
      const templates = rows.filter((template: TemplateRecord) =>
        isTemplateConnectedToProcessStatus(template, processType, status),
      );
      setProcessTemplateModal({
        process,
        processType,
        templates,
        loading: false,
      });
    } catch (error) {
      setProcessTemplateModal({
        process,
        processType,
        templates: [],
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Vorlagen konnten nicht geladen werden.",
      });
    }
  }

  async function renderAndDownloadProcessTemplate(template: TemplateRecord) {
    if (!processTemplateModal) return;
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates)
        throw new Error("Vorlagendienst ist nicht erreichbar.");
      const defaultValues = await loadTemplateDefaultValues();
      const result = await (
        bridge.templates.render as unknown as (
          input: Record<string, unknown>,
        ) => Promise<RenderedTemplateResult>
      )({
        templateId: template.id,
        caseId: selectedCase?.id,
        sourceId: processTemplateModal.process.id,
        values: {
          ...defaultValues,
          ...buildProcessTemplateValues(
            selectedCase,
            processTemplateModal.process,
          ),
        },
        archive: true,
      });
      if (processTemplateModal.processType === "bem") {
        const scan = scanBemProcessExport({
          title: result.title,
          body: result.body,
          status: isEqualizationProcessRecord(processTemplateModal.process)
            ? processTemplateModal.process.applicationStatus
            : processTemplateModal.process.status,
          containsConfidentialNotes:
            isBemProcessRecord(processTemplateModal.process) &&
            Boolean(processTemplateModal.process.confidentialNotes),
          unresolvedPlaceholders: result.unresolvedPlaceholders,
        });
        const confirmed = await confirmDialog({
          variant: "warning",
          title: "BEM-Dokument exportieren?",
          message: buildExportWarningMessage(scan),
          confirmLabel: "Export bestätigen",
          cancelLabel: "Abbrechen",
        });
        if (!confirmed) {
          setProcessTemplateModal((current) =>
            current
              ? {
                  ...current,
                  rendered: result,
                  info: "Export wurde abgebrochen. Das Dokument bleibt im Verlauf archiviert.",
                  error: undefined,
                }
              : current,
          );
          return;
        }
      } else if (
        processTemplateModal.processType === "termination_hearing" &&
        isTerminationHearingRecord(processTemplateModal.process)
      ) {
        const scan = scanSensitiveExportText(
          `${result.subject}\n\n${result.body}\n\n${buildTerminationExportContext(processTemplateModal.process)}\n\n${terminationPrivacyExportNotice()}`,
          {
            context: "Kündigungsanhörung-Export",
            target: result.title,
          },
        );
        const confirmed = await confirmDialog({
          variant: "warning",
          title: "Kündigungsdokument exportieren?",
          message: buildExportWarningMessage(scan),
          confirmLabel: "Export bestätigen",
          cancelLabel: "Abbrechen",
        });
        if (!confirmed) {
          setProcessTemplateModal((current) =>
            current
              ? {
                  ...current,
                  rendered: result,
                  info: "Export wurde abgebrochen. Das Dokument bleibt im Verlauf archiviert.",
                  error: undefined,
                }
              : current,
          );
          return;
        }
      } else {
        const scan = scanSensitiveExportText(result.body, {
          context: "Dokumentenexport",
          target: result.title,
        });
        const confirmed = await confirmDialog({
          variant: "warning",
          title: "Dokument exportieren?",
          message: buildExportWarningMessage(scan),
          confirmLabel: "Export bestätigen",
          cancelLabel: "Abbrechen",
        });
        if (!confirmed) {
          setProcessTemplateModal((current) =>
            current
              ? {
                  ...current,
                  rendered: result,
                  info: "Export wurde abgebrochen. Das Dokument bleibt im Verlauf archiviert.",
                  error: undefined,
                }
              : current,
          );
          return;
        }
      }
      downloadRenderedTemplate(result);
      setProcessTemplateModal((current) =>
        current
          ? {
              ...current,
              rendered: result,
              info: "Dokument wurde erzeugt, heruntergeladen und im Vorlagenverlauf archiviert.",
              error: undefined,
            }
          : current,
      );
    } catch (error) {
      setProcessTemplateModal((current) =>
        current
          ? {
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : "Dokument konnte nicht erzeugt werden.",
            }
          : current,
      );
    }
  }


  return { openProcessTemplateModal, renderAndDownloadProcessTemplate };
}
