import type { ContactRecord } from "../../../core/models/contact.model";
import { formatContactReference } from "../../contacts/contactDisplay";
import { replaceRange } from "./inlineCommandText";
import type { InlineCommandRuntime } from "./inlineCommandRuntime";
import type { InlineContactDraft } from "./inlineCommandTypes";

export function useInlineContactCommands(runtime: InlineCommandRuntime) {
  const {
    drafts: { inlineContactDraft, setInlineContactDraft },
    setContent,
    setNextSteps,
    setNoteInfo,
    setNoteError,
    onCreateContact,
  } = runtime;
  function removeContactCommand(draft: InlineContactDraft) {
    const applyRemoval = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith(draft.token)
        ? draft.markerIndex
        : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, "").replace(
        / {2,}/g,
        " ",
      );
    };

    if (draft.target === "content") setContent(applyRemoval);
    else setNextSteps(applyRemoval);
  }

  function insertInlineContactText(
    draft: InlineContactDraft,
    contact: ContactRecord,
  ) {
    const replacement = formatContactReference(contact);
    const applyReplacement = (current: string) => {
      const index = current.slice(draft.markerIndex).startsWith(draft.token)
        ? draft.markerIndex
        : current.indexOf(draft.token);
      if (index < 0) return current;
      return replaceRange(current, index, draft.token.length, replacement);
    };

    if (draft.target === "content") setContent(applyReplacement);
    else setNextSteps(applyReplacement);
  }

  async function insertExistingContactFromProtocol(contact: ContactRecord) {
    if (!inlineContactDraft) return;
    insertInlineContactText(inlineContactDraft, contact);
    setInlineContactDraft(null);
    setNoteInfo(`Kontakt eingefügt: ${formatContactReference(contact)}`);
  }

  async function createAndInsertContactFromProtocol() {
    setNoteError("");
    setNoteInfo("");
    if (!inlineContactDraft) return;
    if (
      !inlineContactDraft.firstName.trim() ||
      !inlineContactDraft.lastName.trim()
    ) {
      setNoteError("Bitte Vorname und Nachname des Kontakts erfassen.");
      return;
    }

    try {
      const created = await onCreateContact({
        firstName: inlineContactDraft.firstName,
        lastName: inlineContactDraft.lastName,
        organization: inlineContactDraft.organization || undefined,
        role: inlineContactDraft.role || undefined,
        category: inlineContactDraft.category,
        email: inlineContactDraft.email || undefined,
        phone: inlineContactDraft.phone || undefined,
      });
      insertInlineContactText(inlineContactDraft, created);
      setInlineContactDraft(null);
      setNoteInfo(
        `Kontakt angelegt und eingefügt: ${formatContactReference(created)}`,
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Kontakt konnte nicht angelegt werden.",
      );
    }
  }

  function cancelInlineContactDraft() {
    if (inlineContactDraft) removeContactCommand(inlineContactDraft);
    setInlineContactDraft(null);
  }


  return {
    inlineContactDraft,
    setInlineContactDraft,
    insertExistingContactFromProtocol,
    createAndInsertContactFromProtocol,
    cancelInlineContactDraft,
  };
}
