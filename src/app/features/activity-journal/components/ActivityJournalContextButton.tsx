import { Clock3 } from 'lucide-react';
import { useState } from 'react';
import type { ActivityJournalPrefillContext } from '../../../core/models/activity-journal.model';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import { ToolbarButton } from '../../../shared/components/IndustrialButton';
import { dispatchActivityJournalPrefill } from '../activityJournalEvents';
import { ActivityJournalSessionSuggestion } from './ActivityJournalSessionSuggestion';

export function ActivityJournalContextButton({
  context,
  label = 'Tätigkeit erfassen',
  compact = false,
}: {
  context: ActivityJournalPrefillContext;
  label?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function openJournalPrefill() {
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.activityJournal) throw new Error('Tätigkeitsjournal-Dienst ist nicht erreichbar.');
      const prefill = await bridge.activityJournal.buildPrefillFromContext(context);
      dispatchActivityJournalPrefill(prefill, true);
    } catch (error) {
      console.warn('Tätigkeitsjournal-Vorbelegung konnte nicht erzeugt werden.', error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ToolbarButton
        className="case-process-document-link"
        disabled={busy}
        aria-label={`${label}: ${context.title ?? context.caseNumber ?? context.contextType}`}
        onClick={() => void openJournalPrefill()}
        data-e2e="activity-journal-context-button"
      >
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {compact ? 'Journal' : label}
      </ToolbarButton>
      {!compact ? <ActivityJournalSessionSuggestion context={context} onAccept={() => void openJournalPrefill()} /> : null}
    </>
  );
}
