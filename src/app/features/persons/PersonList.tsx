import { UserRoundCheck } from 'lucide-react';
import type { ProtectedPersonRecord } from '../../core/models/protected-person.model';
import { employmentStateLabels, lifecycleStateLabels, protectionStatusLabels } from '../../core/models/protected-person.model';

export function PersonList({
  persons,
  selectedId,
  onSelect
}: {
  persons: ProtectedPersonRecord[];
  selectedId?: string;
  onSelect: (person: ProtectedPersonRecord) => void;
}) {
  return (
    <section className="industrial-panel person-list-panel" aria-labelledby="person-list-heading">
      <div className="industrial-panel-heading">
        <div>
          <p className="industrial-kicker">Personen</p>
          <h2 id="person-list-heading">Personenverzeichnis</h2>
        </div>
        <UserRoundCheck className="h-5 w-5 text-yellow-300" aria-hidden="true" />
      </div>
      <div className="person-list" role="list" aria-label="Personen im Verzeichnis">
        {persons.map((person) => (
          <button
            type="button"
            key={person.id}
            className={`person-list-item ${selectedId === person.id ? 'active' : ''}`}
            onClick={() => onSelect(person)}
          >
            <strong>{person.lastName}, {person.firstName}</strong>
            <span>{protectionStatusLabels[person.protectionStatus]} · {employmentStateLabels[person.employmentState]}</span>
            <small>{lifecycleStateLabels[person.lifecycleState]}</small>
          </button>
        ))}
        {!persons.length && <p className="industrial-muted">Keine Personen gefunden.</p>}
      </div>
    </section>
  );
}
