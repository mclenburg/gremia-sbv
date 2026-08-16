import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ElectionTransferImportService } from '../../../services/electionTransferImportService';
import { ElectionTransferCryptoAdapter } from '../../../services/electionTransferCryptoAdapter';
import { createCompleteElectionTransferPayload } from '../../helpers/electionTransferFixture';

class TransactionDb implements DatabaseAdapter {
  commands: string[] = [];
  writes = 0;
  prepare<T = unknown>(sql: string) {
    return {
      all: (..._params: unknown[]) => [] as T[],
      get: (..._params: unknown[]) => sql.includes('personal_data_audit_log') ? undefined : undefined,
      run: (..._params: unknown[]) => { this.writes += 1; return {}; },
    };
  }
  exec(sql: string): void { this.commands.push(sql); }
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

function envelope() {
  const crypto = new ElectionTransferCryptoAdapter();
  return crypto.encrypt(
    createCompleteElectionTransferPayload('source-election'),
    'eine ausreichend lange Wahlakten-Passphrase',
  );
}

describe('ElectionTransferImportService atomic boundary', () => {
  it('rolls back the unit of work when the domain importer fails before transfer metadata is committed', () => {
    const db = new TransactionDb();
    const service = new ElectionTransferImportService(db);
    expect(() => service.importAtomically(envelope(), 'eine ausreichend lange Wahlakten-Passphrase', () => {
      throw new Error('injected import failure');
    })).toThrow('injected import failure');
    expect(db.commands.some((command) => command.startsWith('ROLLBACK TO SAVEPOINT'))).toBe(true);
    expect(db.writes).toBe(0);
  });

  it('persists import metadata, package mapping and local audit in one successful unit of work', () => {
    const db = new TransactionDb();
    const service = new ElectionTransferImportService(db);
    const result = service.importAtomically(envelope(), 'eine ausreichend lange Wahlakten-Passphrase', () => ({
      importedElectionId: 'local-election',
      importedItems: [{ packageRef: 'election', localEntityType: 'election', localEntityId: 'local-election' }],
    }));
    expect(result.electionId).toBe('local-election');
    expect(db.writes).toBe(3);
    expect(db.commands.some((command) => command.startsWith('RELEASE SAVEPOINT'))).toBe(true);
  });
});
