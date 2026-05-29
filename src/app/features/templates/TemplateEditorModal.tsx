import type { FormEvent } from "react";
import { FileText, Save } from "lucide-react";
import {
  GhostButton,
  IndustrialButton,
} from "../../shared/components/IndustrialButton";
import {
  FormActions,
  FormSection,
  SelectInput,
  TextareaInput,
  TextInput,
} from "../../shared/components/IndustrialForm";
import { IndustrialModal } from "../../shared/dialogs/IndustrialDialogs";
import type {
  CreateTemplateInput,
  TemplateCategory,
  TemplateRecord,
} from "../../core/models/template.model";
import type { PreventionStatus } from "../../core/models/prevention.model";
import {
  preventionStatusOrder,
  statusLabel,
} from "../prevention/preventionShared";
import { templateCategoryLabels } from "./templateCatalogLogic";

type TemplateEditorDraft = CreateTemplateInput | TemplateRecord;

type TemplateEditorModalProps<TDraft extends TemplateEditorDraft> = {
  mode: "create" | "edit";
  draft: TDraft;
  categories: TemplateCategory[];
  processStatus: PreventionStatus | "";
  onDraftChange: (updater: (draft: TDraft) => TDraft) => void;
  onProcessStatusChange: (status: PreventionStatus | "") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

function splitCsv(value: string): string[] {
  return [value];
}

function visibleTags(tags: string[] | undefined): string {
  return (tags ?? [])
    .filter(
      (tag) => tag !== "massnahme:prevention" && !tag.startsWith("status:"),
    )
    .join(", ");
}

export function TemplateEditorModal<TDraft extends TemplateEditorDraft>({
  mode,
  draft,
  categories,
  processStatus,
  onDraftChange,
  onProcessStatusChange,
  onSubmit,
  onClose,
}: TemplateEditorModalProps<TDraft>) {
  const isEdit = mode === "edit";
  const title = isEdit ? draft.title : "Vorlage ergänzen";
  const description = isEdit
    ? "Text, Tags, Normen und Zuordnung dieser Vorlage ändern."
    : "Neue Standardschreiben werden hier angelegt und können anschließend aus Fallakte oder Maßnahme heraus genutzt werden.";

  return (
    <IndustrialModal
      title={title}
      kicker={isEdit ? "Vorlage bearbeiten" : "Eigene Vorlage"}
      description={description}
      icon={<FileText className="h-5 w-5" />}
      onClose={onClose}
      wide
      className="template-create-modal"
      dataE2e={isEdit ? "template-edit-modal" : "template-create-modal"}
    >
      <form onSubmit={onSubmit} className="template-create-form" noValidate>
        <FormSection
          title="Vorlagendaten"
          description="Halte Titel, Normbezug und Tags fachlich sprechend. Technische Status-Tags setzt die Anwendung automatisch."
        >
          <div className="template-form-grid">
            <TextInput
              label="Titel"
              value={draft.title}
              onValueChange={(value) =>
                onDraftChange((current) => ({ ...current, title: value } as TDraft))
              }
              autoFocus
              required
            />
            <SelectInput
              label="Kategorie"
              value={draft.category}
              onValueChange={(value) =>
                onDraftChange((current) => ({
                  ...current,
                  category: value as TemplateCategory,
                } as TDraft))
              }
              options={categories.map((category) => ({
                value: category,
                label: templateCategoryLabels[category],
              }))}
            />
            <SelectInput
              label="Maßnahmenstatus"
              value={processStatus}
              onValueChange={(value) =>
                onProcessStatusChange(value as PreventionStatus | "")
              }
              disabled={draft.category !== "praevention"}
              options={[
                { value: "", label: "alle / nicht gebunden" },
                ...preventionStatusOrder.map((status) => ({
                  value: status,
                  label: statusLabel(status),
                })),
              ]}
              helpText="Nur für Präventionsvorlagen relevant."
            />
            <TextInput
              label="Normen"
              value={(draft.legalBasis ?? []).join(", ")}
              onValueChange={(value) =>
                onDraftChange((current) => ({
                  ...current,
                  legalBasis: splitCsv(value),
                } as TDraft))
              }
              placeholder="§ 178 Abs. 2 Satz 1 SGB IX"
            />
            <TextInput
              label="Tags"
              value={visibleTags(draft.tags)}
              onValueChange={(value) =>
                onDraftChange((current) => ({
                  ...current,
                  tags: splitCsv(value),
                } as TDraft))
              }
              placeholder="Beteiligung, Frist, HR"
            />
          </div>
        </FormSection>

        <FormSection
          title="Textinhalt"
          description="Platzhalter kannst du über das Hilfe-Symbol im Vorlagenkatalog nachschlagen."
        >
          <div className="industrial-form-grid industrial-form-grid-1">
            <TextInput
              label="Beschreibung"
              value={draft.description ?? ""}
              onValueChange={(value) =>
                onDraftChange((current) => ({ ...current, description: value } as TDraft))
              }
            />
            <TextInput
              label="Betreff"
              value={draft.subject}
              onValueChange={(value) =>
                onDraftChange((current) => ({ ...current, subject: value } as TDraft))
              }
              placeholder="Beteiligung der SBV – {{fall.aktenzeichen}}"
            />
            <TextareaInput
              label="Text"
              value={draft.body}
              onValueChange={(value) =>
                onDraftChange((current) => ({ ...current, body: value } as TDraft))
              }
              textCommandFieldId={
                isEdit ? "template-edit-body" : "template-new-body"
              }
              placeholder="Sehr geehrte Damen und Herren, ..."
              wide
              required
            />
          </div>
          <p className="template-form-hint">
            {isEdit
              ? "Bei Präventionsvorlagen werden die Tags massnahme:prevention und status:… automatisch gesetzt."
              : "Eigene Vorlagen werden lokal im verschlüsselten Datenbestand gespeichert."}
          </p>
        </FormSection>

        <FormActions>
          <GhostButton type="button" onClick={onClose}>
            Abbrechen
          </GhostButton>
          <IndustrialButton type="submit">
            <Save className="h-4 w-4" aria-hidden="true" />
            {isEdit ? "Änderungen speichern" : "Vorlage speichern"}
          </IndustrialButton>
        </FormActions>
      </form>
    </IndustrialModal>
  );
}
