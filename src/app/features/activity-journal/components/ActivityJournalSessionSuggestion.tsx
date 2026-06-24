import { Clock3, X } from 'lucide-react';
import type { ActivityJournalPrefillContext } from '../../../core/models/activity-journal.model';
import { IndustrialButton, IconButton } from '../../../shared/components/IndustrialButton';
import { useActivityJournalSessionSuggestion } from '../hooks/useActivityJournalSessionSuggestion';

export function ActivityJournalSessionSuggestion({
  context,
  onAccept,
}: {
  context: ActivityJournalPrefillContext;
  onAccept: () => void;
}) {
  const suggestion = useActivityJournalSessionSuggestion(context);
  if (!suggestion.visible) return null;

  return (
    <div className="industrial-message industrial-message-warning mt-3" role="status" data-e2e="activity-journal-session-suggestion">
      <Clock3 className="h-4 w-4" aria-hidden="true" />
      <span>{suggestion.label} Gespeichert wird erst nach bewusster Bestätigung.</span>
      <IndustrialButton compact variant="secondary" onClick={onAccept}>
        Vorlage öffnen
      </IndustrialButton>
      <IconButton aria-label="Journal-Vorschlag verwerfen" onClick={suggestion.dismiss}>
        <X className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
