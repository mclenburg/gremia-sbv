import { useRef } from 'react';
import type { CaseNoteInlineActionInput } from '../../core/models/case-note.model';

export function useCaseNoteInlineActionBindings() {
  const clearDrafts = useRef<() => void>(() => undefined);
  const getPending = useRef<() => CaseNoteInlineActionInput[]>(() => []);

  return {
    clearDrafts,
    getPending,
    bindClearDrafts: (handler: () => void) => { clearDrafts.current = handler; },
    bindGetPending: (handler: () => CaseNoteInlineActionInput[]) => { getPending.current = handler; },
  };
}
