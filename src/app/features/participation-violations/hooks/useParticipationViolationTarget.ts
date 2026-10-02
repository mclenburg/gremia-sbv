import { useEffect, useRef, useState } from 'react';
import type { SbvParticipationViolationRecord } from '../../../../domain/models/sbv-participation-violation.model';
import { waitForBridge } from '../../../core/bridge/waitForBridge';

export function useParticipationViolationTarget(targetId?: string, onTargetConsumed?: () => void) {
  const [targetItem, setTargetItem] = useState<SbvParticipationViolationRecord | null>(null);
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
      if (!bridge?.sbvParticipationViolations) throw new Error('Verstoßdienst nicht erreichbar');
      const item = await bridge.sbvParticipationViolations.get(targetId);
      if (!active) return;
      if (item) setTargetItem(item);
      else setTargetError('Der verknüpfte Beteiligungsverstoß ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.');
    }).catch(() => {
      if (active) setTargetError('Der Beteiligungsverstoß konnte nicht geladen werden. Versuchen Sie es erneut über die Wiedervorlage.');
    }).finally(() => {
      if (active) { setTargetLoading(false); onTargetConsumedRef.current?.(); }
    });
    return () => { active = false; };
  }, [targetId]);

  return { targetItem, setTargetItem, targetError, targetLoading };
}
