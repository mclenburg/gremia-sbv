import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { EqualizationIntakeService } from '../../../services/equalizationIntakeService';
import { MigrationService } from '../../../services/migrationService';
import { RetentionService } from '../../../services/retentionService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

let db: DatabaseAdapter;
let service: EqualizationIntakeService;

beforeEach(async () => {
  db = await openTestDatabase();
  new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  service = new EqualizationIntakeService(db);
});

afterEach(() => db.close());

function count(table: string): number {
  return db.prepare<{ value: number }>(`SELECT COUNT(*) AS value FROM ${table}`).get()?.value ?? -1;
}

describe('Gleichstellungs-/GdB-Erstanlage als fachlicher Verbund', () => {
  it('legt Person, verknüpfte Fallakte und Verfahren gemeinsam an', () => {
    const result = service.create({
      person: { mode: 'new_identified', firstName: 'Ada', lastName: 'Lovelace' },
      caseNumber: 'SBV-GDB-2026-001',
      category: 'gdb',
      summary: 'Unterstützung beim GdB-Antrag',
    });

    expect(result.person).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace', protectionStatus: 'application_pending' });
    expect(result.caseRecord).toMatchObject({
      caseNumber: 'SBV-GDB-2026-001',
      category: 'gdb',
      protectedPersonId: result.person.id,
      personBindingState: 'active',
    });
    expect(result.process).toMatchObject({ caseId: result.caseRecord.id, applicationStatus: 'beratung' });
    expect(db.prepare<{ value: number }>(
      `SELECT COUNT(*) AS value FROM person_case_links
       WHERE protected_person_id = ? AND case_file_id = ? AND link_state = 'active'`,
    ).get(result.person.id, result.caseRecord.id)?.value).toBe(1);
  });

  it('verwendet eine ausgewählte Person ohne einen zweiten Personeneintrag anzulegen', () => {
    const person = service.create({
      person: { mode: 'new_identified', firstName: 'Erste', lastName: 'Person' },
      caseNumber: 'SBV-GL-2026-001',
      category: 'gleichstellung',
    }).person;

    const result = service.create({
      person: { mode: 'existing', protectedPersonId: person.id },
      caseNumber: 'SBV-GL-2026-002',
      category: 'gleichstellung',
    });

    expect(result.person.id).toBe(person.id);
    expect(count('protected_persons')).toBe(1);
    expect(count('cases')).toBe(2);
    expect(count('equalization_processes')).toBe(2);
  });

  it('legt eine pseudonyme Anfrage ohne Direktidentifikatoren an', () => {
    const result = service.create({
      person: { mode: 'new_pseudonymous', pseudonymLabel: 'Anfrage G-17' },
      caseNumber: 'SBV-GL-2026-003',
      category: 'gleichstellung',
    });

    expect(result.person).toMatchObject({
      recordKind: 'pseudonymous_request',
      pseudonymLabel: 'Anfrage G-17',
      firstName: '',
      lastName: '',
      protectionStatus: 'unclear',
    });
    expect(result.caseRecord).toMatchObject({ personBindingState: 'anonymous_request', isPseudonymized: true });
  });

  it('rollt den gesamten Verbund zurück, wenn die Fallakte nicht angelegt werden kann', () => {
    service.create({
      person: { mode: 'new_identified', firstName: 'Vorhandene', lastName: 'Person' },
      caseNumber: 'SBV-DOPPELT',
      category: 'gdb',
    });

    expect(() => service.create({
      person: { mode: 'new_identified', firstName: 'Rollback', lastName: 'Person' },
      caseNumber: 'SBV-DOPPELT',
      category: 'gdb',
    })).toThrow(/bereits vergeben/);

    expect(count('protected_persons')).toBe(1);
    expect(count('cases')).toBe(1);
    expect(count('person_case_links')).toBe(1);
    expect(count('equalization_processes')).toBe(1);
  });

  it('projiziert Verfahren und Personenbezug korrekt in die manuelle Löschprüfung', () => {
    const result = service.create({
      person: { mode: 'new_identified', firstName: 'Aufbewahrung', lastName: 'Test' },
      caseNumber: 'SBV-RETENTION-001',
      category: 'gleichstellung',
    });
    db.prepare(`UPDATE equalization_processes SET application_status = 'abgeschlossen', updated_at = ? WHERE id = ?`)
      .run('2023-01-01T00:00:00.000Z', result.process.id);

    const dashboard = new RetentionService(db, () => '').buildDashboard();

    expect(dashboard.candidates).toContainEqual(expect.objectContaining({
      entityType: 'equalization_gdb',
      entityId: result.process.id,
      caseId: result.caseRecord.id,
      recommendedAction: 'pruefen',
    }));
    expect(dashboard.candidates).not.toContainEqual(expect.objectContaining({
      entityType: 'protected_person',
      entityId: result.person.id,
    }));
  });
});
