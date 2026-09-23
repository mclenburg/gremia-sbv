import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { MobileCompanionReturnChange } from '../src/domain/models/mobile-companion.model.js';

type ImportedChangeRow = { local_entity_type: string; local_entity_id: string };

export class MobileCompanionChangeImportStore {
  constructor(private readonly database: DatabaseAdapter) {}

  find(sourceKeyFingerprint: string, mobileChangeId: string): ImportedChangeRow | undefined {
    return this.database.prepare<ImportedChangeRow>(`
      SELECT local_entity_type, local_entity_id
      FROM mobile_companion_change_imports
      WHERE source_key_fingerprint = ? AND mobile_change_id = ?
    `).get(sourceKeyFingerprint, mobileChangeId);
  }

  record(input: {
    sourceKeyFingerprint: string;
    change: MobileCompanionReturnChange;
    localEntityType: string;
    localEntityId: string;
    handoverImportId: string;
    importedAt: string;
  }): void {
    this.database.prepare(`
      INSERT INTO mobile_companion_change_imports (
        id, source_key_fingerprint, mobile_change_id, change_type,
        local_entity_type, local_entity_id, handover_import_id, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), input.sourceKeyFingerprint, input.change.mobileId, input.change.type,
      input.localEntityType, input.localEntityId, input.handoverImportId, input.importedAt,
    );
  }
}
