import { AlertTriangle } from 'lucide-react';
import type { RecruitingInterviewEventRecord, RecruitingParticipationRecord } from '../../../domain/models/recruiting-participation.model';
import { GhostButton } from '../../shared/components/IndustrialButton';
import { FormSection, SelectInput } from '../../shared/components/IndustrialForm';
import { EmptyState, SearchToolbar, WorkbenchListPanel } from '../../shared/components/WorkbenchLayout';
import { ActivityJournalContextButton } from '../activity-journal/components/ActivityJournalContextButton';
import {
  formatRecruitingDate,
  getRecruitingRiskHints,
  recruitingStatusLabels,
  recruitingAccessibilityStatusLabels,
  recruitingApplicantStatusLabels,
  type RecruitingListStatusFilter,
} from './recruitingViewLogic';

export function RecruitingListPanel({
  records,
  filteredRecords,
  selectedId,
  loading,
  query,
  statusFilter,
  onQueryChange,
  onStatusFilterChange,
  onSelect,
}: {
  records: RecruitingParticipationRecord[];
  filteredRecords: RecruitingParticipationRecord[];
  selectedId: string | null;
  loading: boolean;
  query: string;
  statusFilter: RecruitingListStatusFilter;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: RecruitingListStatusFilter) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <WorkbenchListPanel ariaLabel="Liste der Stellenbesetzungen">
      <SearchToolbar
        searchValue={query}
        onSearchChange={onQueryChange}
        searchLabel="Stellenbesetzungen suchen"
        searchPlaceholder="Stelle, Kennziffer oder Organisationseinheit"
        resultCount={filteredRecords.length}
      >
        <SelectInput
          label="Status filtern"
          value={statusFilter}
          options={[
            { value: 'all', label: 'Alle' },
            { value: 'open', label: 'Offen' },
            { value: 'closed', label: 'Abgeschlossen' },
          ]}
          onValueChange={(value) => onStatusFilterChange(value as RecruitingListStatusFilter)}
        />
      </SearchToolbar>
      {records.length === 0 && !loading ? <div className="industrial-empty-state">Noch keine Stellenbesetzung dokumentiert.</div> : null}
      {records.length > 0 && filteredRecords.length === 0 ? <EmptyState title="Keine Treffer" text="Keine passende Stellenbesetzung gefunden." /> : null}
      {filteredRecords.map((record) => {
        const hints = getRecruitingRiskHints(record);
        return (
          <GhostButton
            key={record.id}
            className={`industrial-record-card industrial-tone-${record.flaggedForViolationReview ? 'danger' : hints.length > 0 ? 'warning' : 'default'} ${selectedId === record.id ? 'is-active' : ''}`}
            onClick={() => onSelect(record.id)}
            aria-current={selectedId === record.id ? 'true' : undefined}
          >
            <span className="industrial-kicker">{record.vacancyReference || 'ohne Kennziffer'}</span>
            <strong>{record.vacancyTitle}</strong>
            <span>{record.department || 'Organisationseinheit offen'} · {recruitingStatusLabels[record.status]}</span>
            <span>{record.interviewCount} Gespräch(e) · Anhörung bis {formatRecruitingDate(record.hearingDueDate)}</span>
            {hints.length > 0 ? <span className="participation-card-warning"><AlertTriangle className="industrial-icon-sm" /> {hints.join(' · ')}</span> : null}
          </GhostButton>
        );
      })}
    </WorkbenchListPanel>
  );
}

export function RecruitingInterviewEvents({ interviews }: { interviews: RecruitingInterviewEventRecord[] }) {
  return (
    <FormSection kicker="Ereignisse" title="Dokumentierte Vorstellungsgespräche">
      {interviews.length === 0 ? <div className="industrial-empty-state">Noch kein Vorstellungsgespräch erfasst.</div> : null}
      <div className="industrial-stack">
        {interviews.map((interview) => (
          <article key={interview.id} className="industrial-record-card industrial-tone-default">
            <p className="industrial-kicker">{formatRecruitingDate(interview.interviewDate)} · {recruitingApplicantStatusLabels[interview.applicantStatus]}</p>
            <strong>{interview.applicantRef}</strong>
            <p>SBV eingeladen: {interview.sbvInvited ? 'ja' : 'nein'} · teilgenommen: {interview.sbvAttended ? 'ja' : 'nein'} · Barrierefreiheit: {recruitingAccessibilityStatusLabels[interview.accessibilityCheckStatus]}</p>
            <div className="industrial-action-row">
              <ActivityJournalContextButton
                compact
                context={{
                  contextType: 'recruiting_interview',
                  contextId: interview.id,
                  title: 'Vorstellungsgespräch: SBV-Teilnahme dokumentiert',
                  category: 'participation',
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </FormSection>
  );
}
