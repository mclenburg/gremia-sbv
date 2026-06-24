import { Clock, FileText, Plus, Search, Trash2 } from 'lucide-react';
import type { ActivityJournalCategory, ActivityJournalEntryRecord, ActivityJournalPrefill } from '../../core/models/activity-journal.model';
import { ACTIVITY_JOURNAL_CATEGORIES } from '../../core/models/activity-journal.model';
import { activityJournalCategoryLabels, activityJournalTimeModeLabels } from '../../core/labels/activityJournalLabels';
import { IndustrialButton, IconButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { CheckboxField, DateInput, DateTimeInput, FormActions, FormSection, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DataTable, EmptyState, IndustrialWarningPanel, WorkbenchGrid, WorkbenchPage, WorkbenchSummary } from '../../shared/components/WorkbenchLayout';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { categoryLabel, entryReferenceLabel, formatDuration } from './activityJournalLogic';
import { useActivityJournal } from './hooks/useActivityJournal';

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
      kicker="SBV-Nachweislinie"
      title="Tätigkeitsjournal"
      description="Interne Eigenaufzeichnung der Schwerbehindertenvertretung: keine Arbeitgeber-Zeiterfassung, keine stille Speicherung, keine automatische Übermittlung."
    >
      <ModuleFeedback items={[
        journal.message ? { id: 'activity-journal-message', tone: 'success', message: journal.message } : null,
        journal.error ? { id: 'activity-journal-error', tone: 'warning', message: journal.error } : null,
      ]} />

      <WorkbenchGrid>
        <FormSection
          kicker="Schnellerfassung"
          title="Tätigkeit erfassen"
          description="Gespeichert wird erst mit Klick auf „Speichern“. Zeitangaben sind optional und bleiben SBV-Selbstdokumentation."
          actions={<Plus className="h-5 w-5 text-yellow-300" aria-hidden="true" />}
        >
          <div className="industrial-form-grid industrial-form-grid-auto">
            <TextInput
              label="Was wurde gemacht?"
              value={journal.form.title}
              required
              placeholder="z. B. Unterlagen für BEM-Gespräch geprüft"
              onValueChange={(title) => journal.setForm({ ...journal.form, title })}
            />
            <DateInput
              label="Datum"
              value={journal.form.entryDate}
              onValueChange={(entryDate) => journal.setForm({ ...journal.form, entryDate })}
            />
            <SelectInput
              label="Kategorie"
              value={journal.form.category}
              options={categoryOptions}
              onValueChange={(category) => journal.setForm({ ...journal.form, category: category as ActivityJournalCategory })}
            />
            <SelectInput
              label="Zeitmodus"
              value={journal.form.timeMode}
              options={timeModeOptions}
              onValueChange={(timeMode) => journal.setForm({ ...journal.form, timeMode: timeMode as typeof journal.form.timeMode })}
            />
            {journal.form.timeMode === 'duration' ? (
              <TextInput
                label="Minuten"
                type="number"
                min={0}
                value={journal.form.durationMinutes}
                onValueChange={(durationMinutes) => journal.setForm({ ...journal.form, durationMinutes })}
              />
            ) : null}
            {journal.form.timeMode === 'range' ? (
              <>
                <DateTimeInput
                  label="Start"
                  value={journal.form.startedAt}
                  onValueChange={(startedAt) => journal.setForm({ ...journal.form, startedAt })}
                />
                <DateTimeInput
                  label="Ende"
                  value={journal.form.endedAt}
                  onValueChange={(endedAt) => journal.setForm({ ...journal.form, endedAt })}
                />
              </>
            ) : null}
            <TextareaInput
              label="Kurzbeschreibung / Kontext"
              value={journal.form.description}
              wide
              textCommandFieldId="activity-journal-description"
              helpText={journal.form.category === 'sbv_self_organization' ? 'Bei SBV-Selbstorganisation bitte konkret beschreiben, was organisiert wurde.' : undefined}
              onValueChange={journal.updateDescription}
            />
            <TextareaInput
              label="Ergebnis / nächster Schritt"
              value={journal.form.resultNote}
              wide
              textCommandFieldId="activity-journal-result"
              onValueChange={journal.updateResultNote}
            />
            {journal.timeSuggestion ? (
              <IndustrialWarningPanel className="industrial-field-wide">
                <strong>/zeit-Vorschlag</strong>
                <p>{journal.timeSuggestion.label}</p>
                <div className="industrial-action-row mt-2">
                  <ToolbarButton onClick={journal.acceptTimeSuggestion}>Übernehmen</ToolbarButton>
                  <ToolbarButton onClick={journal.dismissTimeSuggestion}>Verwerfen</ToolbarButton>
                </div>
              </IndustrialWarningPanel>
            ) : null}
            <DateInput
              label="Wiedervorlage optional"
              value={journal.form.followUpDueAt}
              onValueChange={(followUpDueAt) => journal.setForm({ ...journal.form, followUpDueAt, status: followUpDueAt ? 'follow_up_open' : journal.form.status })}
            />
            <CheckboxField
              label="Außerhalb der regulären Arbeitszeit angefallen"
              checked={journal.form.performedOutsideContractWorkTime}
              onCheckedChange={(performedOutsideContractWorkTime) => journal.setForm({ ...journal.form, performedOutsideContractWorkTime })}
            />
          </div>
          <FormActions align="between">
            <span className="industrial-settings-note">Hinweis: interne SBV-Selbstdokumentation, keine Arbeitgeberabrechnung.</span>
            <IndustrialButton loading={journal.busy} disabled={!journal.form.title.trim()} onClick={() => void journal.saveEntry()}>
              Speichern
            </IndustrialButton>
          </FormActions>
        </FormSection>

        <FormSection
          kicker="Lokale Suche"
          title="Journalübersicht"
          actions={<FileText className="h-5 w-5 text-yellow-300" aria-hidden="true" />}
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
