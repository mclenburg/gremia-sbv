import { useCallback, useEffect, useState } from "react";
import type { CaseMeasureNoteRecord } from "../../../core/models/case-measure.model";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../../shared/a11y/LiveRegionProvider";
import { fromDateTimeLocal } from "../../../shared/format/dates";
import type { MeasureNotesPanelProps, MeasureNoteFormState } from "./measureNoteTypes";
import { createEmptyMeasureNoteForm, createMeasureNoteFormFromRecord } from "./measureNoteTypes";

async function requireCaseMeasuresBridge() {
  const bridge = await waitForBridge();
  if (!bridge?.caseMeasures) {
    throw new Error("Maßnahmennotizdienst ist nicht erreichbar.");
  }
  return bridge.caseMeasures;
}

export function useMeasureNotes({ caseId, measureType, measureId }: Omit<MeasureNotesPanelProps, "measureTitle">) {
  const [notes, setNotes] = useState<CaseMeasureNoteRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<MeasureNoteFormState>(() => createEmptyMeasureNoteForm());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MeasureNoteFormState>(() => createEmptyMeasureNoteForm());
  const [error, setError] = useState("");
  const announce = useAnnouncer();

  const loadNotes = useCallback(async () => {
    const caseMeasures = await requireCaseMeasuresBridge();
    const rows = await caseMeasures.listNotes(caseId, measureType, measureId);
    setNotes(rows);
  }, [caseId, measureId, measureType]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const caseMeasures = await requireCaseMeasuresBridge();
        const rows = await caseMeasures.listNotes(caseId, measureType, measureId);
        if (active) setNotes(rows);
      } catch (loadError) {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Maßnahmennotizen konnten nicht geladen werden.";
          setError(message);
          announce(message, "assertive");
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [announce, caseId, measureId, measureType]);

  function startCreate() {
    setEditingNoteId(null);
    setIsCreating((current) => !current);
  }

  function startEdit(note: CaseMeasureNoteRecord) {
    setError("");
    setIsCreating(false);
    setEditingNoteId(note.id);
    setEditForm(createMeasureNoteFormFromRecord(note));
  }

  function cancelEdit() {
    setEditingNoteId(null);
    setEditForm(createEmptyMeasureNoteForm());
  }

  async function createNote() {
    setError("");
    try {
      const caseMeasures = await requireCaseMeasuresBridge();
      await caseMeasures.createNote({
        caseId,
        measureType,
        measureId,
        title: createForm.title,
        noteAt: fromDateTimeLocal(createForm.noteAt),
        participants: createForm.participants,
        content: createForm.content,
        nextSteps: createForm.nextSteps,
        containsHealthData: true,
        confidentialLevel: "sensibel",
      });
      setCreateForm(createEmptyMeasureNoteForm());
      setIsCreating(false);
      await loadNotes();
      announce("Maßnahmennotiz wurde gespeichert.", "polite");
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Maßnahmennotiz konnte nicht gespeichert werden.";
      setError(message);
      announce(message, "assertive");
    }
  }

  async function updateNote(noteId: string) {
    setError("");
    try {
      const caseMeasures = await requireCaseMeasuresBridge();
      await caseMeasures.updateNote(noteId, {
        title: editForm.title,
        noteAt: fromDateTimeLocal(editForm.noteAt),
        participants: editForm.participants,
        content: editForm.content,
        nextSteps: editForm.nextSteps,
        containsHealthData: true,
        confidentialLevel: "sensibel",
      });
      cancelEdit();
      await loadNotes();
      announce("Maßnahmennotiz wurde aktualisiert.", "polite");
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Maßnahmennotiz konnte nicht aktualisiert werden.";
      setError(message);
      announce(message, "assertive");
    }
  }

  async function deleteNote(note: CaseMeasureNoteRecord) {
    setError("");
    try {
      const caseMeasures = await requireCaseMeasuresBridge();
      await caseMeasures.deleteNote(note.id);
      if (editingNoteId === note.id) cancelEdit();
      await loadNotes();
      announce("Maßnahmennotiz wurde gelöscht.", "polite");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Maßnahmennotiz konnte nicht gelöscht werden.";
      setError(message);
      announce(message, "assertive");
    }
  }

  return {
    notes,
    isCreating,
    createForm,
    setCreateForm,
    editingNoteId,
    editForm,
    setEditForm,
    error,
    startCreate,
    setIsCreating,
    startEdit,
    cancelEdit,
    createNote,
    updateNote,
    deleteNote,
  };
}
