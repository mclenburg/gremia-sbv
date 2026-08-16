import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ProtectedPersonService } from '../../../services/protectedPersonService';
import { SbvElectionService } from '../../../services/sbvElectionService';

class SqliteAdapter implements DatabaseAdapter {
  constructor(private readonly db: DatabaseSync) {}
  prepare<T = unknown>(sql: string) {
    const statement = this.db.prepare(sql);
    return {
      all: (...params: unknown[]) => statement.all(...params as []) as T[],
      get: (...params: unknown[]) => statement.get(...params as []) as T | undefined,
      run: (...params: unknown[]) => statement.run(...params as []),
    };
  }
  exec(sql: string) { this.db.exec(sql); }
  pragma(sql: string) { return this.db.exec(`PRAGMA ${sql}`); }
  close() { this.db.close(); }
}

function services() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const db = new SqliteAdapter(raw);
  return { raw, persons: new ProtectedPersonService(db), elections: new SbvElectionService(db) };
}

describe('Wählerliste aus bestehenden Personen und Arbeitgeberdatei', () => {
  it('übernimmt standardmäßig nur aktiv beschäftigte schwerbehinderte und gleichgestellte Personen und bleibt idempotent', () => {
    const { persons, elections } = services();
    const anna = persons.create({ firstName: 'Anna', lastName: 'Schwer', organizationalUnit: 'IT', employmentState: 'active_employee', protectionStatus: 'severely_disabled', evidenceCheckedAt: '2026-08-01' });
    persons.create({ firstName: 'Gerd', lastName: 'Gleich', organizationalUnit: 'HR', employmentState: 'active_employee', protectionStatus: 'equivalent', evidenceCheckedAt: '2026-08-02' });
    persons.create({ firstName: 'Offen', lastName: 'Antrag', employmentState: 'active_employee', protectionStatus: 'application_pending' });
    persons.create({ firstName: 'Ehemalig', lastName: 'Person', employmentState: 'left_company', leftCompanyAt: '2026-07-31', protectionStatus: 'severely_disabled' });

    const election = elections.create({ kind: 'extraordinary_no_sbv', triggerReason: 'vakant' });
    const first = elections.syncVotersFromPersons(election.id);
    expect(first).toMatchObject({ eligiblePersons: 2, created: 2, updated: 0, unchanged: 0 });
    expect(elections.overview(election.id).voters.map((voter) => [voter.lastName, voter.eligibilityBasis]).sort()).toEqual([
      ['Gleich', 'equalized_confirmed'],
      ['Schwer', 'severely_disabled_confirmed'],
    ]);

    const second = elections.syncVotersFromPersons(election.id);
    expect(second).toMatchObject({ eligiblePersons: 2, created: 0, updated: 0, unchanged: 2 });
    expect(elections.overview(election.id).voters).toHaveLength(2);

    persons.update(anna.id, { employmentState: 'left_company', leftCompanyAt: '2026-08-16' });
    const third = elections.syncVotersFromPersons(election.id);
    expect(third).toMatchObject({ eligiblePersons: 1, created: 0, updated: 1, unchanged: 1 });
    expect(elections.overview(election.id).voters.find((voter) => voter.lastName === 'Schwer')).toMatchObject({ listStatus: 'not_eligible', eligibilityBasis: 'not_eligible_other' });
  });

  it('importiert die Personen-Excel/CSV-Struktur direkt in die Wählerliste ohne das Personenverzeichnis zu verändern', async () => {
    const { persons, elections } = services();
    const election = elections.create({ kind: 'extraordinary_no_sbv', triggerReason: 'vakant' });
    const result = await elections.importVotersFromPersonFile(election.id, {
      sourceFileName: 'wahlberechtigte.csv',
      fileType: 'csv',
      csvText: 'Name;Status;Organisation;Beschäftigungsende\nMuster, Maria;schwerbehindert;IT;\nGleich, Georg;gleichgestellt;HR;\nAntrag, Antje;Antrag läuft;IT;\nAlt, Alfred;schwerbehindert;IT;31.07.2026',
      delimiter: ';',
      headerRowIndex: 0,
      firstDataRowIndex: 1,
      mapping: {
        fullName: 'Name',
        fullNameMode: 'last_comma_first',
        protectionStatus: 'Status',
        organizationalUnit: 'Organisation',
        leftCompanyAt: 'Beschäftigungsende',
      },
    });

    expect(result).toMatchObject({ totalRows: 4, imported: 2, skipped: 2 });
    expect(elections.overview(election.id).voters.map((voter) => voter.lastName).sort()).toEqual(['Gleich', 'Muster']);
    expect(persons.list()).toHaveLength(0);
  });
});
