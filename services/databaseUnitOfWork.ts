import type { DatabaseAdapter } from './databaseService.js';

export interface UnitOfWorkOptions {
  mode?: 'deferred' | 'immediate';
}

/**
 * Defines the atomic boundary for mandatory database changes.
 * Recoverable projections such as the search index must run after this method returns.
 */
export class DatabaseUnitOfWork {
  constructor(private readonly db: DatabaseAdapter) {}

  run<T>(operation: () => T, options: UnitOfWorkOptions = {}): T {
    this.db.exec(options.mode === 'deferred' ? 'BEGIN' : 'BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // Preserve the original failure. A rollback failure is secondary here.
      }
      throw error;
    }
  }
}
