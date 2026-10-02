import { useEffect, useRef, useState } from 'react';
import type { ActivityJournalEntryRecord } from '../../../../domain/models/activity-journal.model';
import { waitForBridge } from '../../../core/bridge/waitForBridge';

export function useActivityJournalTarget(targetId?: string, onTargetConsumed?: () => void) {
  const [detailEntry, setDetailEntry] = useState<ActivityJournalEntryRecord | null>(null);
  const [targetError, setTargetError] = useState('');
  const [targetLoading, setTargetLoading] = useState(false);
  const onTargetConsumedRef = useRef(onTargetConsumed);

  useEffect(() => { onTargetConsumedRef.current = onTargetConsumed; }, [onTargetConsumed]);
  useEffect(() => {
    if (!targetId) return;
    let active = true;
    setTargetLoading(true);
    setTargetError('');
    void waitForBridge().then(async (bridge) => {
      if (!bridge?.activityJournal) throw new Error('Journal nicht erreichbar');
      const entry = await bridge.activityJournal.get(targetId);
      if (!active) return;
      if (entry) setDetailEntry(entry);
      else setTargetError('Der verknüpfte Journaleintrag ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.');
    }).catch(() => {
      if (active) setTargetError('Der Journaleintrag konnte nicht geladen werden. Versuchen Sie es erneut über die Wiedervorlage.');
    }).finally(() => {
      if (active) { setTargetLoading(false); onTargetConsumedRef.current?.(); }
    });
    return () => { active = false; };
  }, [targetId]);

  return { detailEntry, setDetailEntry, targetError, targetLoading };
}
