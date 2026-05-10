import { Trash2, UserRoundCheck } from 'lucide-react';
import type { ProtectedPersonRecord } from '../../core/models/protected-person.model';
import { employmentStateLabels, lifecycleStateLabels, protectionStatusLabels } from '../../core/models/protected-person.model';

function personLabel(person: ProtectedPersonRecord): string {
  if (person.recordKind === 'pseudonymous_request') return person.pseudonymLabel || 'Anonyme Anfrage';
  return `${person.lastName}, ${person.firstName}`;
}

export function PersonList({
  persons,
  selectedId,
  onSelect,
  onDelete
}: {
  persons: ProtectedPersonRecord[];
  selectedId?: string;
  onSelect: (person: ProtectedPersonRecord) => void;
  onDelete: (person: ProtectedPersonRecord) => void;
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
        {persons.map((person) => {
          const label = personLabel(person);
          return (
            <div key={person.id} className={`person-list-item ${selectedId === person.id ? 'active' : ''}`} role="listitem">
              <button type="button" className="person-list-select" onClick={() => onSelect(person)}>
                <strong>{label}</strong>
                <span>{protectionStatusLabels[person.protectionStatus]} · {employmentStateLabels[person.employmentState]}</span>
                <small>{lifecycleStateLabels[person.lifecycleState]}</small>
              </button>
              <button
                type="button"
                className="person-list-delete"
                aria-label={`Person löschen: ${label}`}
                title={`Person löschen: ${label}`}
                onClick={() => onDelete(person)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
        {!persons.length && <p className="industrial-muted">Keine Personen gefunden.</p>}
      </div>
    </section>
  );
}
