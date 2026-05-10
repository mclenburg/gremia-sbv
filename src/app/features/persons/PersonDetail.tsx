import type { CaseRecord } from '../../core/models/case.model';
import type { ProtectedPersonRecord, UpdateProtectedPersonInput } from '../../core/models/protected-person.model';
import { employmentStateLabels, lifecycleStateLabels, protectionStatusLabels } from '../../core/models/protected-person.model';
import { toInputDate } from './personImportUi';
import { PersonLifecycleReviewDialog } from './PersonLifecycleReviewDialog';

export function PersonDetail({
  person,
  cases,
  onUpdate
}: {
  person: ProtectedPersonRecord | null;
  cases: CaseRecord[];
  onUpdate: (id: string, input: UpdateProtectedPersonInput) => Promise<void>;
}) {
  if (!person) {
    return (
      <section className="industrial-panel person-detail-empty" aria-label="Keine Person ausgewählt">
        <p className="industrial-muted">Wählen Sie links eine Person aus, um Status, Beschäftigung und Datenschutz-Lifecycle zu prüfen.</p>
      </section>
    );
  }

  async function updateSelected(input: UpdateProtectedPersonInput) {
    await onUpdate(person!.id, input);
  }

  return (
    <section className="industrial-panel person-detail" aria-labelledby="person-detail-heading">
      <p className="industrial-kicker">Detail</p>
      <h2 id="person-detail-heading">{person.lastName}, {person.firstName}</h2>
      <dl className="person-detail-grid">
        <div><dt>Schutzstatus</dt><dd>{protectionStatusLabels[person.protectionStatus]}</dd></div>
        <div><dt>Beschäftigung</dt><dd>{employmentStateLabels[person.employmentState]}</dd></div>
        <div><dt>Lifecycle</dt><dd>{lifecycleStateLabels[person.lifecycleState]}</dd></div>
        <div><dt>Status gültig bis</dt><dd>{person.statusValidUntil ?? '—'}</dd></div>
      </dl>
      <PersonLifecycleReviewDialog person={person} />
      <div className="industrial-settings-form">
        <label>
          <span>Status gültig bis</span>
          <input type="date" defaultValue={toInputDate(person.statusValidUntil)} onBlur={(event) => void updateSelected({ statusValidUntil: event.target.value || undefined })} />
        </label>
        <label>
          <span>Beschäftigungsende</span>
          <input type="date" defaultValue={toInputDate(person.leftCompanyAt)} onBlur={(event) => void updateSelected({ employmentState: event.target.value ? 'left_company' : 'active_employee', leftCompanyAt: event.target.value || undefined })} />
        </label>
      </div>
      <p className="industrial-muted">Verknüpfte Fallakten werden bei einer Anonymisierung nicht mehr mit Namen angezeigt, sondern erhalten eine Datenschutz-Prüfmarkierung.</p>
      <p className="industrial-meta">Verfügbare Fallakten: {cases.length}</p>
    </section>
  );
}
