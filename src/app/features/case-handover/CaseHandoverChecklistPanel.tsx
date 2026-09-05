import { useEffect, useMemo, useState } from 'react';
import type { CaseHandoverChecklist, CaseHandoverChecklistConfirmation, CaseHandoverPackageType } from '../../../domain/models/case-handover.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

function stateLabel(state: string): string {
  if (state === 'blocking') return 'Blockierend';
  if (state === 'attention') return 'Prüfen';
  return 'OK';
}

export function CaseHandoverChecklistPanel({
  packageType,
  caseIds,
  expiresAt,
  acknowledgements,
  onAcknowledgementsChange,
}: {
  packageType: CaseHandoverPackageType;
  caseIds: readonly string[];
  expiresAt?: string;
  acknowledgements: readonly string[];
  onAcknowledgementsChange: (value: string[]) => void;
}) {
  const announce = useAnnouncer();
  const [checklist, setChecklist] = useState<CaseHandoverChecklist | null>(null);
  const [error, setError] = useState('');
  const joinedCaseIds = useMemo(() => [...caseIds].sort().join('|'), [caseIds]);

  useEffect(() => {
    let cancelled = false;
    setError('');
    void window.gremiaSbv.caseHandover.checklist({ packageType, caseIds: [...caseIds], expiresAt })
      .then((next) => {
        if (cancelled) return;
        setChecklist(next);
        const allowed = new Set(next.requiredAcknowledgementIds);
        onAcknowledgementsChange(acknowledgements.filter((id) => allowed.has(id)));
      })
      .catch((cause) => {
        if (cancelled) return;
        const message = cause instanceof Error ? cause.message : 'Übergabe-Checkliste konnte nicht geprüft werden.';
        setError(message);
        announce(message, 'assertive');
      });
    return () => { cancelled = true; };
  }, [packageType, joinedCaseIds, expiresAt]);

  function toggle(itemId: string) {
    onAcknowledgementsChange(acknowledgements.includes(itemId)
      ? acknowledgements.filter((id) => id !== itemId)
      : [...acknowledgements, itemId]);
  }

  return <fieldset className="industrial-selection-card handover-checklist">
    <legend>Übergabe-Checkliste</legend>
    {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
    {!checklist ? <p className="industrial-meta">Checkliste wird geprüft …</p> : <>
      <div className="industrial-list" aria-label="Prüfpunkte der Übergabe">
        {checklist.items.map((entry) => <div key={entry.id} className={`handover-checklist-item handover-checklist-item-${entry.state}`}>
          <span className="industrial-status-badge">{stateLabel(entry.state)}</span>
          <div>
            <strong>{entry.label}</strong>
            <p>{entry.description}</p>
            {entry.requiresAcknowledgement ? <label className="industrial-checkbox-row">
              <input type="checkbox" checked={acknowledgements.includes(entry.id)} onChange={() => toggle(entry.id)} />
              <span>Bewusst geprüft und für diese Übergabe bestätigt.</span>
            </label> : null}
          </div>
        </div>)}
      </div>
      {checklist.blockingItemIds.length ? <div className="industrial-message industrial-message-warning" role="alert">Diese Übergabe ist noch nicht exportfähig. Bitte die blockierenden Punkte korrigieren.</div> : null}
    </>}
  </fieldset>;
}

export function handoverChecklistConfirmation(acknowledgedItemIds: readonly string[]): CaseHandoverChecklistConfirmation {
  return { version: 1, acknowledgedItemIds: [...acknowledgedItemIds] };
}
