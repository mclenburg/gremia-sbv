import { Clock, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ActivityJournalCategory, ActivityJournalEntryRecord, ActivityJournalPrefill } from '../../../domain/models/activity-journal.model';
import { ACTIVITY_JOURNAL_CATEGORIES } from '../../../domain/models/activity-journal.model';
import { activityJournalCategoryLabels, activityJournalTimeModeLabels } from '../../../domain/labels/activityJournalLabels';
import { IconButton, IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormSection, SelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DataTable, EmptyState, WorkbenchGrid, WorkbenchPage, WorkbenchSummary, type DataTableRow } from '../../shared/components/WorkbenchLayout';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { categoryLabel, entryReferenceLabel, formatDuration } from './activityJournalLogic';
import { useActivityJournal } from './hooks/useActivityJournal';
import { useActivityJournalTarget } from './hooks/useActivityJournalTarget';
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

function ActivityJournalEntryDialog({ entry, onClose }: { entry: ActivityJournalEntryRecord; onClose: () => void }) {
  return <IndustrialModal title={entry.title} kicker="Journaleintrag" onClose={onClose}
    actions={<ToolbarButton onClick={onClose}>Schließen</ToolbarButton>}>
    <dl className="industrial-meta-grid">
      <div><dt>Datum</dt><dd>{new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(entry.entryDate))}</dd></div>
      <div><dt>Kategorie</dt><dd>{categoryLabel(entry.category)}</dd></div>
      <div><dt>Status</dt><dd>{statusLabel(entry)}</dd></div>
      <div><dt>Zeit</dt><dd>{formatDuration(entry.durationMinutes)}</dd></div>
      {entry.followUpDueAt ? <div><dt>Wiedervorlage</dt><dd>{new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(entry.followUpDueAt))}</dd></div> : null}
      {entry.description ? <div><dt>Beschreibung</dt><dd>{entry.description}</dd></div> : null}
      {entry.resultNote ? <div><dt>Ergebnis</dt><dd>{entry.resultNote}</dd></div> : null}
    </dl>
  </IndustrialModal>;
}

function entryRows(entries: ActivityJournalEntryRecord[], busy: boolean, onOpen: (entry: ActivityJournalEntryRecord) => void, onDelete: (entry: ActivityJournalEntryRecord) => void): DataTableRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    cells: [
      entry.entryDate,
      <div key="activity" className="industrial-content-fragment">
        <strong>{entry.title}</strong>
        {entry.resultNote ? <p className="industrial-settings-note">{entry.resultNote}</p> : null}
      </div>,
      categoryLabel(entry.category),
      <span key="time" className="industrial-text-fragment"><Clock className="inline-icon" /> {formatDuration(entry.durationMinutes)}</span>,
      entryReferenceLabel(entry),
      statusLabel(entry),
      <div key="actions" className="industrial-table-actions">
        <IconButton aria-label={`Journaleintrag ${entry.title} ansehen`} onClick={() => onOpen(entry)}>
          <Eye className="industrial-icon" aria-hidden="true" />
        </IconButton>
        <IconButton aria-label={`Journaleintrag ${entry.title} löschen`} disabled={busy} onClick={() => onDelete(entry)}>
          <Trash2 className="industrial-icon" aria-hidden="true" />
        </IconButton>
      </div>,
    ],
  }));
}

export function ActivityJournalView({
  pendingPrefill,
  onPrefillConsumed,
  targetId,
  onTargetConsumed,
}: {
  pendingPrefill?: ActivityJournalPrefill | null;
  onPrefillConsumed?: () => void;
  targetId?: string;
  onTargetConsumed?: () => void;
}) {
  const journal = useActivityJournal(pendingPrefill, onPrefillConsumed);
  const confirmDialog = useConfirmDialog();
  const [createOpen, setCreateOpen] = useState(Boolean(pendingPrefill));
  const { detailEntry, setDetailEntry, targetError, targetLoading } = useActivityJournalTarget(targetId, onTargetConsumed);
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

  const rows = entryRows(journal.entries, journal.busy, setDetailEntry, (entry) => void confirmDelete(entry));

  return (
    <WorkbenchPage
      title="Tätigkeitsjournal"
      helpId="activityJournal.overview"
      actions={<IndustrialButton onClick={() => setCreateOpen(true)}><Plus className="industrial-icon" aria-hidden="true" /> Tätigkeit erfassen</IndustrialButton>}
    >
      <ModuleFeedback items={[
        journal.message ? { id: 'activity-journal-message', tone: 'success', message: journal.message } : null,
        journal.error ? { id: 'activity-journal-error', tone: 'warning', message: journal.error } : null,
        targetError ? { id: 'activity-journal-target-error', tone: 'warning', message: targetError } : null,
      ]} />

      {targetLoading ? <p role="status">Journaleintrag wird geladen.</p> : null}
      {detailEntry ? <ActivityJournalEntryDialog entry={detailEntry} onClose={() => setDetailEntry(null)} /> : null}

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
              <Search className="inline-icon" aria-hidden="true" /> {journal.entries.length} Treffer
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
