import { describe, expect, it } from 'vitest';
import { ParticipationService } from '../services/participationService';
import type { DatabaseAdapter } from '../services/databaseService';

const legacyRow = {
  id: 'legacy-participation-1',
  case_id: 'case-1',
  title: 'Legacy-Beteiligung',
  measure_type: 'versetzung',
  status: 'unterrichtung_pruefen',
  risk_level: 'normal',
  person_status: 'schwerbehindert',
  decision_stage: 'vor_entscheidung',
  first_known_at: '2026-05-01T08:00:00.000Z',
  information_received_at: '2026-05-01T09:00:00.000Z',
  hearing_requested_at: '2026-05-01T10:00:00.000Z',
  statement_due_at: '2026-05-08T08:00:00.000Z',
  statement_submitted_at: null,
  employer_decision_at: null,
  implementation_at: null,
  information_complete: 1,
  hearing_before_decision: 1,
  decision_notified: 0,
  suspension_requested_at: null,
  suspension_due_at: null,
  violation_summary: null,
  sbv_position: 'SBV prüft die Unterrichtung.',
  next_step: 'Unterlagen prüfen.',
  created_at: '2026-05-01T08:00:00.000Z',
  updated_at: '2026-05-01T08:00:00.000Z',
};

class ParticipationMigrationDb implements DatabaseAdapter {
  rows: Record<string, any[]> = {
    case_measures: [],
    case_measure_participation: [],
    sbv_participations: [{ ...legacyRow }],
  };

  constructor(seedWrongSourceCollision = false) {
    if (seedWrongSourceCollision) {
      this.rows.case_measures.push({
        id: 'unrelated-measure-with-legacy-source',
        case_id: 'case-1',
        type: 'participation',
        title: 'Altlast mit falschem Maßnahmentyp',
        status: 'open',
        risk_level: 'normal',
        created_from: 'demo_seed',
        source_id: legacyRow.id,
        opened_at: legacyRow.created_at,
        created_at: legacyRow.created_at,
        updated_at: legacyRow.updated_at,
      });
    }
  }

  prepare<T = unknown>(sql: string) {
    const db = this;
    return {
      all(..._params: unknown[]): T[] {
        if (sql.includes('PRAGMA table_info(case_measures)')) {
          return [
            'id',
            'case_id',
            'type',
            'title',
            'status',
            'risk_level',
            'created_from',
            'summary',
            'next_step',
            'due_at',
            'opened_at',
            'closed_at',
            'requires_follow_up',
            'source_id',
            'created_at',
            'updated_at',
            'handover_import_id',
            'handover_package_id',
            'handover_valid_until',
            'handover_status',
            'handover_continue_confirmed_at',
            'handover_continue_reason',
          ].map((name) => ({ name })) as T[];
        }
        if (sql.includes('SELECT * FROM sbv_participations')) {
          return db.rows.sbv_participations as T[];
        }
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (sql.includes("sqlite_master") && sql.includes("sbv_participations")) {
          return { name: 'sbv_participations' } as T;
        }
        if (sql.includes("SELECT id FROM case_measures WHERE id = ? OR (source_id = ? AND type = 'sbv_participation')")) {
          const [id, sourceId] = params;
          return db.rows.case_measures.find(
            (row) => row.id === id || (row.source_id === sourceId && row.type === 'sbv_participation'),
          ) as T | undefined;
        }
        if (sql.includes('SELECT measure_id FROM case_measure_participation WHERE measure_id = ?')) {
          return db.rows.case_measure_participation.find((row) => row.measure_id === params[0]) as T | undefined;
        }
        return undefined;
      },
      run(...params: unknown[]) {
        if (sql.includes('INSERT INTO case_measures')) {
          db.rows.case_measures.push({
            id: params[0],
            case_id: params[1],
            type: 'sbv_participation',
            title: params[2],
            status: params[3],
            risk_level: params[4],
            created_from: 'migration',
            summary: params[5],
            next_step: params[6],
            due_at: params[7],
            opened_at: params[8],
            closed_at: params[9],
            requires_follow_up: params[10],
            source_id: params[11],
            created_at: params[12],
            updated_at: params[13],
          });
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO case_measure_participation')) {
          const measureId = params[0];
          if (!db.rows.case_measures.some((row) => row.id === measureId)) {
            throw new Error(`FOREIGN KEY constraint failed for ${String(measureId)}`);
          }
          db.rows.case_measure_participation.push({
            measure_id: measureId,
            employer_measure_type: params[1],
            person_status: params[2],
            decision_stage: params[3],
            participation_status: params[4],
          });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }

  exec(): void {}
  pragma(): unknown { return []; }
  close(): void {}
}

describe('SBV-Beteiligung Legacy-Migration', () => {
  it('legt bei falschen source_id-Kollisionen eine eigene SBV-Beteiligungsmaßnahme an', () => {
    const db = new ParticipationMigrationDb(true);

    expect(() => new ParticipationService(db)).not.toThrow();

    const migratedMeasure = db.rows.case_measures.find((row) => row.id === legacyRow.id);
    expect(migratedMeasure).toMatchObject({
      id: legacyRow.id,
      type: 'sbv_participation',
      source_id: legacyRow.id,
    });
    expect(db.rows.case_measure_participation).toEqual([
      expect.objectContaining({
        measure_id: legacyRow.id,
        employer_measure_type: legacyRow.measure_type,
        participation_status: legacyRow.status,
      }),
    ]);
  });

  it('verwendet eine bereits korrekt migrierte SBV-Beteiligungsmaßnahme weiter', () => {
    const db = new ParticipationMigrationDb(false);
    db.rows.case_measures.push({
      id: 'already-migrated-measure',
      case_id: 'case-1',
      type: 'sbv_participation',
      source_id: legacyRow.id,
    });

    new ParticipationService(db);

    expect(db.rows.case_measures.filter((row) => row.type === 'sbv_participation')).toHaveLength(1);
    expect(db.rows.case_measure_participation[0]).toMatchObject({
      measure_id: 'already-migrated-measure',
      employer_measure_type: legacyRow.measure_type,
    });
  });
});
