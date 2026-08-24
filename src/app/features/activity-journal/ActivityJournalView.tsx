import { Clock, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ActivityJournalCategory, ActivityJournalEntryRecord, ActivityJournalPrefill } from '../../../domain/models/activity-journal.model';
import { ACTIVITY_JOURNAL_CATEGORIES } from '../../../domain/models/activity-journal.model';
import { activityJournalCategoryLabels, activityJournalTimeModeLabels } from '../../../domain/labels/activityJournalLabels';
import { IconButton, IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormSection, SelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DataTable, EmptyState, WorkbenchGrid, WorkbenchPage, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { categoryLabel, entryReferenceLabel, formatDuration } from './activityJournalLogic';
import { useActivityJournal } from './hooks/useActivityJournal';
import { ActivityJournalCreateDialog } from './ActivityJournalCreateDialog';

const categoryOptions = ACTIVITY_JOURNAL_CATEGORIES.map((category) => ({
  value: category,
  label: activityJournalCategoryLabels[category],
}));

const categoryFilterOptions = [
  { value: '', label: 'alle Kategorien' },
  ...ACTIVITY_JOURNAL_CATEGORIES.map((category) => ({ value: category, label: categoryLabel(category) })),
];

const timeModeOptions = [
  { value: 'none', label: activityJournalTimeModeLabels.none },
  { value: 'duration', label: activityJournalTimeModeLabels.duration },
  { value: 'range', label: activityJournalTimeModeLabels.range },
];

function statusLabel(entry: ActivityJournalEntryRecord): string {
  if (entry.status === 'follow_up_open') return 'Wiedervorlage';
  if (entry.status === 'draft') return 'Entwurf';
  return 'final';
}

export function ActivityJournalView({
  pendingPrefill,
  onPrefillConsumed,
}: {
  pendingPrefill?: ActivityJournalPrefill | null;
  onPrefillConsumed?: () => void;
}) {
  const journal = useActivityJournal(pendingPrefill, onPrefillConsumed);
  const confirmDialog = useConfirmDialog();
  const [createOpen, setCreateOpen] = useState(Boolean(pendingPrefill));
  useEffect(() => { if (pendingPrefill) setCreateOpen(true); }, [pendingPrefill]);

  async function confirmDelete(entry: ActivityJournalEntryRecord) {
    const ok = await confirmDialog({
      variant: 'danger',
      title: 'Journaleintrag löschen?',
      message: `Der Journaleintrag wird gelöscht. Verknüpfte Journal-Wiedervorlagen werden ebenfalls entfernt.\n\n${entry.title}`,
      confirmLabel: 'Journaleintrag löschen',
      cancelLabel: 'Abbrechen',
    });
    if (ok) await journal.deleteEntry(entry.id);
  }

  const summaryItems = journal.summary ? [
    { label: 'Heute', value: formatDuration(journal.summary.todayMinutes) },
    { label: 'Woche', value: formatDuration(journal.summary.weekMinutes) },
    { label: 'Monat', value: formatDuration(journal.summary.monthMinutes) },
    { label: 'Einträge', value: journal.summary.totalEntries },
  ] : [];

  const rows = journal.entries.map((entry) => ({
    id: entry.id,
    cells: [
      entry.entryDate,
      <div key="activity">
        <strong>{entry.title}</strong>
        {entry.resultNote ? <p className="industrial-settings-note mt-1">{entry.resultNote}</p> : null}
      </div>,
      categoryLabel(entry.category),
      <span key="time"><Clock className="inline h-4 w-4" /> {formatDuration(entry.durationMinutes)}</span>,
      entryReferenceLabel(entry),
      statusLabel(entry),
      <IconButton key="delete" aria-label={`Journaleintrag ${entry.title} löschen`} disabled={journal.busy} onClick={() => void confirmDelete(entry)}>
        <Trash2 className="h-4 w-4" />
      </IconButton>,
    ],
  }));

  return (
    <WorkbenchPage
      title="Tätigkeitsjournal"
      helpId="activityJournal.overview"
      actions={<IndustrialButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Tätigkeit erfassen</IndustrialButton>}
    >
      <ModuleFeedback items={[
        journal.message ? { id: 'activity-journal-message', tone: 'success', message: journal.message } : null,
        journal.error ? { id: 'activity-journal-error', tone: 'warning', message: journal.error } : null,
      ]} />

      {createOpen ? <ActivityJournalCreateDialog journal={journal} categoryOptions={categoryOptions} timeModeOptions={timeModeOptions} onClose={() => setCreateOpen(false)} /> : null}

      <WorkbenchGrid>
        <FormSection
          kicker="Lokale Suche"
          title="Journalübersicht"
        >
          {journal.summary ? <WorkbenchSummary items={summaryItems} ariaLabel="Tätigkeitsjournal-Zusammenfassung" /> : null}

          <div className="industrial-search-toolbar" role="search">
            <TextInput
              label="Suche"
              type="search"
              value={journal.search}
              placeholder="Titel, Beschreibung, Ergebnis"
              onValueChange={journal.setSearch}
            />
            <SelectInput
              label="Kategorie"
              value={journal.categoryFilter}
              options={categoryFilterOptions}
              onValueChange={(categoryFilter) => journal.setCategoryFilter(categoryFilter as ActivityJournalCategory | '')}
            />
            <div className="industrial-search-actions">
              <ToolbarButton disabled={journal.busy} onClick={() => void journal.reload()}>
                Aktualisieren
              </ToolbarButton>
              <ToolbarButton disabled={journal.busy} onClick={() => void journal.previewExport()}>
                Vorschau
              </ToolbarButton>
              <ToolbarButton disabled={journal.busy} onClick={() => void journal.markExported()}>
                Nachweis markieren
              </ToolbarButton>
            </div>
            <span className="industrial-search-count" aria-live="polite">
              <Search className="inline h-4 w-4" aria-hidden="true" /> {journal.entries.length} Treffer
            </span>
          </div>

          <DataTable
            headers={['Datum', 'Tätigkeit', 'Kategorie', 'Zeit', 'Bezug', 'Status', 'Aktion']}
            rows={rows}
            ariaLabel="Tätigkeitsjournal-Einträge"
            empty={<EmptyState title="Keine Einträge" text="Noch keine passenden Journaleinträge vorhanden." />}
          />
        </FormSection>
      </WorkbenchGrid>
    </WorkbenchPage>
  );
}
