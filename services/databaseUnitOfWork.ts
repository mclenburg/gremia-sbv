import type { DatabaseAdapter } from './databaseService.js';

export interface UnitOfWorkOptions {
  mode?: 'deferred' | 'immediate';
}

let savepointSequence = 0;

function nextSavepointName(): string {
  savepointSequence += 1;
  return `gremia_uow_${savepointSequence}`;
}

/**
 * Defines an atomic boundary for mandatory database changes.
 * SQLite savepoints work both as top-level transactions and as nested units of work,
 * so services can safely call other transactional services.
 * Recoverable projections must run after this method returns.
 */
export class DatabaseUnitOfWork {
  constructor(private readonly database: DatabaseAdapter) {}

  run<T>(operation: () => T, _options: UnitOfWorkOptions = {}): T {
    const savepoint = nextSavepointName();
    this.database.exec(`SAVEPOINT ${savepoint}`);
    try {
      const result = operation();
      this.database.exec(`RELEASE SAVEPOINT ${savepoint}`);
      return result;
    } catch (error) {
      try {
        this.database.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        this.database.exec(`RELEASE SAVEPOINT ${savepoint}`);
      } catch {
        // Preserve the original failure. Cleanup failure is secondary.
      }
      throw error;
    }
  }
}
