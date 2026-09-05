import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditElectionTransferProcessed } from './auditEventBuilders.js';
import { ElectionTransferCryptoAdapter, type ElectionTransferEnvelope } from './electionTransferCryptoAdapter.js';
import type { ElectionTransferPayload } from './electionTransferPolicy.js';
import { TransferInstanceIdentityService, type TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';

export interface ElectionTransferImportResult {
  importId: string;
  packageId: string;
  electionId: string;
  manifestHash: string;
}

export type ElectionTransferImporter = (payload: ElectionTransferPayload, context: { importId: string }) => {
  importedElectionId: string;
  importedItems: Array<{ packageRef: string; localEntityType: string; localEntityId: string }>;
};

export class ElectionTransferImportService {
  constructor(private readonly database: DatabaseAdapter, private readonly crypto = new ElectionTransferCryptoAdapter()) {}

  importAtomically(envelope: ElectionTransferEnvelope, passphrase: string, importer: ElectionTransferImporter): ElectionTransferImportResult {
    const payload = this.crypto.decrypt(envelope, passphrase, this.localIdentityFor(envelope));
    const manifestHash = this.crypto.manifestHash(payload);
    const importId = randomUUID();
    const now = new Date().toISOString();
    let importedElectionId = '';
    try {
      new DatabaseUnitOfWork(this.database).run(() => {
        const imported = importer(payload, { importId });
        if (!imported.importedElectionId.trim()) throw new Error('Import hat keine lokale Wahl-ID geliefert.');
        importedElectionId = imported.importedElectionId;
        this.database.prepare(`
          INSERT INTO sbv_election_transfer_imports (
            id, source_package_id, imported_at, format_version, source_vault_id_hash,
            source_manifest_hash, status, imported_election_id, metadata_json_minimal
          ) VALUES (?, ?, ?, ?, ?, ?, 'imported', ?, ?)
        `).run(importId, payload.manifest.packageId, now, payload.manifest.formatVersion, payload.manifest.sourceVaultIdHash, manifestHash, importedElectionId, JSON.stringify({ itemCount: imported.importedItems.length }));
        const insertItem = this.database.prepare(`
          INSERT INTO sbv_election_transfer_import_items (
            id, import_id, package_ref, local_entity_type, local_entity_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const item of imported.importedItems) {
          insertItem.run(randomUUID(), importId, item.packageRef, item.localEntityType, item.localEntityId, now);
        }
        new PersonalDataAuditLogService(this.database).append(auditElectionTransferProcessed({
          action: 'import', packageId: payload.manifest.packageId, formatVersion: payload.manifest.formatVersion, manifestHash, result: 'success',
        }));
      });
    } catch (error) {
      // UoW guarantees that package metadata, imported entities and the local audit row roll back together.
      throw error;
    }
    return { importId, packageId: payload.manifest.packageId, electionId: importedElectionId, manifestHash };
  }

  private localIdentityFor(envelope: ElectionTransferEnvelope): TransferInstancePrivateIdentity | undefined {
    return envelope.recipientBinding ? new TransferInstanceIdentityService(this.database).getPrivateIdentity() : undefined;
  }
}
