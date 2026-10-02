import { useEffect, useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { ProtectedPersonRecord } from '../../../domain/models/protected-person.model';

export function usePersonDeadlineTarget({
  persons,
  targetPersonId,
  onTargetConsumed,
  setSelectedId,
  setQuery,
  onMissing,
}: {
  persons: ProtectedPersonRecord[];
  targetPersonId?: string | null;
  onTargetConsumed?: () => void;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setQuery: Dispatch<SetStateAction<string>>;
  onMissing: () => void;
}) {
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetPersonId) return;
    if (persons.some((person) => person.id === targetPersonId)) {
      setQuery('');
      setSelectedId(targetPersonId);
      setFocusTargetId(targetPersonId);
    } else {
      onMissing();
    }
    onTargetConsumed?.();
  }, [targetPersonId, persons, onTargetConsumed, setSelectedId, setQuery, onMissing]);

  useLayoutEffect(() => {
    if (!focusTargetId) return;
    document.getElementById('person-detail-heading')?.focus();
  }, [focusTargetId]);
}
