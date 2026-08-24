import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { CaseService } from './caseService.js';
import { EqualizationService } from './equalizationService.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import type {
  CreateEqualizationIntakeInput,
  EqualizationIntakeResult,
} from '../src/domain/models/equalization.model.js';
import type { ProtectedPersonRecord } from '../src/domain/models/protected-person.model.js';

function required(value: string, message: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function personDisplayName(person: ProtectedPersonRecord): string {
  if (person.recordKind === 'pseudonymous_request') {
    return required(person.pseudonymLabel ?? '', 'Für eine pseudonyme Anfrage ist eine Bezeichnung erforderlich.');
  }
  return `${person.firstName} ${person.lastName}`.trim();
}

/**
 * Atomic application service for the guided Equalization/GdB intake.
 * The person, case binding and process are one user action and must never be
 * persisted as an incomplete combination.
 */
export class EqualizationIntakeService {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly persons: ProtectedPersonService = new ProtectedPersonService(db),
    private readonly cases: CaseService = new CaseService(() => db),
    private readonly equalization: EqualizationService = new EqualizationService(db),
  ) {}

  create(input: CreateEqualizationIntakeInput): EqualizationIntakeResult {
    const caseNumber = required(input.caseNumber, 'Bitte ein Aktenzeichen erfassen.');
    if (input.category !== 'gleichstellung' && input.category !== 'gdb') {
      throw new Error('Bitte Gleichstellung oder GdB-Antrag als Vorgang wählen.');
    }

    return new DatabaseUnitOfWork(this.db).run(() => {
      const person = this.resolvePerson(input.person);
      const personBindingState = person.recordKind === 'pseudonymous_request' ? 'anonymous_request' : 'active';
      const caseRecord = this.cases.createCase({
        caseNumber,
        displayName: personDisplayName(person),
        category: input.category,
        summary: input.summary?.trim() || undefined,
        protectedPersonId: person.id,
        personBindingState,
        isPseudonymized: true,
      });
      const process = this.equalization.create({
        caseId: caseRecord.id,
        applicationStatus: 'beratung',
        createDefaultDeadline: false,
      });
      return { person, caseRecord, process };
    });
  }

  private resolvePerson(input: CreateEqualizationIntakeInput['person']): ProtectedPersonRecord {
    if (input.mode === 'existing') {
      const person = this.persons.get(required(input.protectedPersonId, 'Bitte eine Person auswählen.'));
      if (!person) throw new Error('Die ausgewählte Person wurde nicht gefunden.');
      return person;
    }
    if (input.mode === 'new_pseudonymous') {
      return this.persons.create({
        recordKind: 'pseudonymous_request',
        firstName: '',
        lastName: '',
        pseudonymLabel: required(input.pseudonymLabel, 'Bitte eine Bezeichnung für die pseudonyme Anfrage erfassen.'),
        employmentState: 'unknown',
        protectionStatus: 'unclear',
        statusSource: 'self_disclosure',
      });
    }
    return this.persons.create({
      recordKind: 'identified_person',
      firstName: required(input.firstName, 'Bitte den Vornamen erfassen.'),
      lastName: required(input.lastName, 'Bitte den Nachnamen erfassen.'),
      employmentState: 'active_employee',
      protectionStatus: 'application_pending',
      statusSource: 'self_disclosure',
    });
  }
}
