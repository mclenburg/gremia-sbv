import type {
  CaseMeasureNoteProcessType,
  CaseMeasureNoteRecord,
} from "../../../core/models/case-measure.model";
import { toDateTimeLocal } from "../../../shared/format/dates";

export type MeasureNotesPanelProps = {
  caseId: string;
  measureType: CaseMeasureNoteProcessType;
  measureId: string;
  measureTitle: string;
};

export type MeasureNoteFormState = {
  title: string;
  noteAt: string;
  participants: string;
  content: string;
  nextSteps: string;
};

export function createEmptyMeasureNoteForm(): MeasureNoteFormState {
  return {
    title: "Terminnotiz",
    noteAt: toDateTimeLocal(new Date().toISOString()),
    participants: "",
    content: "",
    nextSteps: "",
  };
}

export function createMeasureNoteFormFromRecord(note: CaseMeasureNoteRecord): MeasureNoteFormState {
  return {
    title: note.title,
    noteAt: toDateTimeLocal(note.noteAt),
    participants: note.participants ?? "",
    content: note.content,
    nextSteps: note.nextSteps ?? "",
  };
}
