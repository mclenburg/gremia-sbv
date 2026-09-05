import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditElectionTransferProcessed } from './auditEventBuilders.js';
import { OWNER_ONLY_FILE_MODE, restrictFileToOwner } from './secureFilePermissions.js';
import {
  ElectionTransferCryptoAdapter,
  type ElectionTransferEnvelope,
} from './electionTransferCryptoAdapter.js';
import { ElectionTransferImportService } from './electionTransferImportService.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { TransferInstanceIdentityService, type TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import {
  createElectionTransferManifest,
  ELECTION_TRANSFER_TABLE_REFS,
  electionManifestHash,
  hashElectionTransferSourceVaultId,
  sha256Canonical,
  type ElectionTransferPayload,
} from './electionTransferPolicy.js';
import type { ElectionTransferInspection } from '../src/domain/models/election-execution.model.js';

const ELECTION_TABLES = ELECTION_TRANSFER_TABLE_REFS;

interface ImportItem {
  packageRef: string;
  localEntityType: string;
  localEntityId: string;
}

export class ElectionTransferService {
  private readonly crypto = new ElectionTransferCryptoAdapter();
  private readonly importer: ElectionTransferImportService;

  constructor(private readonly database: DatabaseAdapter) {
    this.importer = new ElectionTransferImportService(database, this.crypto);
  }

  export(electionId: string, sourceVaultId: string, passphrase: string, targetRecipientToken: string): ElectionTransferEnvelope {
    const payload = this.createPayload(electionId, sourceVaultId);
    const envelope = this.crypto.encrypt(payload, passphrase, parseTransferRecipientToken(targetRecipientToken));
    this.auditExport(electionId, payload);
    return envelope;
  }


  async exportToFile(electionId: string, sourceVaultId: string, passphrase: string, targetRecipientToken: string, targetPath: string): Promise<ElectionTransferInspection> {
    const payload = this.createPayload(electionId, sourceVaultId);
    const envelope = this.crypto.encrypt(payload, passphrase, parseTransferRecipientToken(targetRecipientToken));
    this.auditExport(electionId, payload);
    await fs.promises.writeFile(targetPath, JSON.stringify(envelope, null, 2), { mode: OWNER_ONLY_FILE_MODE });
    await restrictFileToOwner(targetPath);
    return this.inspectPayload(payload);
  }

  async inspectFile(filePath: string, passphrase: string): Promise<ElectionTransferInspection> {
    return this.inspect(await this.readEnvelope(filePath), passphrase);
  }

  async importFromFile(filePath: string, passphrase: string) {
    return this.import(await this.readEnvelope(filePath), passphrase);
  }

  private async readEnvelope(filePath: string): Promise<ElectionTransferEnvelope> {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) throw new Error('Wahlaktenpaket ist keine reguläre Datei.');
    if (stat.size > 50 * 1024 * 1024) throw new Error('Wahlaktenpaket überschreitet die zulässige Dateigröße.');
    const raw = await fs.promises.readFile(filePath, 'utf8');
    let parsed: unknown;
    try { parsed = JSON.parse(raw) as unknown; } catch { throw new Error('Wahlaktenpaket ist kein gültiger JSON-Container.'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Wahlaktenpaket ist ungültig.');
    return parsed as ElectionTransferEnvelope;
  }

  inspect(envelope: ElectionTransferEnvelope, passphrase: string): ElectionTransferInspection {
    return this.inspectPayload(this.crypto.decrypt(envelope, passphrase, this.localIdentityFor(envelope)));
  }

  import(envelope: ElectionTransferEnvelope, passphrase: string) {
    return this.importer.importAtomically(envelope, passphrase, (payload) => this.importPayload(payload));
  }

  private localIdentityFor(envelope: ElectionTransferEnvelope): TransferInstancePrivateIdentity | undefined {
    return envelope.recipientBinding ? new TransferInstanceIdentityService(this.database).getPrivateIdentity() : undefined;
  }

  private inspectPayload(payload: ElectionTransferPayload): ElectionTransferInspection {
    return {
      packageId: payload.manifest.packageId,
      electionId: payload.manifest.electionId,
      createdAt: payload.manifest.createdAt,
      formatVersion: payload.manifest.formatVersion,
      legalRuleVersion: payload.manifest.legalRuleVersion,
      itemCount: payload.manifest.items.length,
      manifestHash: this.crypto.manifestHash(payload),
    };
  }

  private auditExport(electionId: string, payload: ElectionTransferPayload): void {
    const manifestHash = electionManifestHash(payload.manifest);
    new DatabaseUnitOfWork(this.database).run(() => {
      this.database.prepare(`
        INSERT INTO sbv_election_archive_exports(
          id,election_id,export_type,format_version,created_at,manifest_hash,file_count,destination_path_metadata_minimal
        ) VALUES(?,?,?,?,?,?,?,NULL)
      `).run(
        randomUUID(), electionId, 'transfer_container', payload.manifest.formatVersion,
        payload.manifest.createdAt, manifestHash, payload.manifest.items.length,
      );
      new PersonalDataAuditLogService(this.database).append(auditElectionTransferProcessed({
        action: 'export',
        packageId: payload.manifest.packageId,
        formatVersion: payload.manifest.formatVersion,
        manifestHash,
        result: 'success',
      }));
    });
  }

  private createPayload(electionId: string, sourceVaultId: string): ElectionTransferPayload {
    if (!this.database.prepare<{ id: string }>('SELECT id FROM sbv_elections WHERE id=?').get(electionId)) {
      throw new Error('Wahlvorgang wurde nicht gefunden.');
    }
    const data: Record<string, unknown> = {};
    for (const table of ELECTION_TABLES) data[table] = this.readElectionTable(table, electionId);
    data.deadlines = this.database.prepare<Record<string, unknown>>(`
      SELECT * FROM deadlines WHERE process_type='election' AND process_id=? ORDER BY id
    `).all(electionId);
    data.sbv_retention_legal_holds = this.database.prepare<Record<string, unknown>>(`
      SELECT * FROM sbv_retention_legal_holds WHERE owner_type='election' AND owner_id=? ORDER BY id
    `).all(electionId);

    const items = Object.entries(data).map(([ref, value]) => ({
      ref,
      entityType: ref === 'sbv_elections' ? 'election' : ref,
      sha256: sha256Canonical(value),
    }));
    const manifest = createElectionTransferManifest(
      electionId,
      hashElectionTransferSourceVaultId(sourceVaultId),
      items,
    );
    return { manifest, data };
  }

  private readElectionTable(table: typeof ELECTION_TABLES[number], electionId: string): Record<string, unknown>[] {
    if (table === 'sbv_elections') {
      return this.database.prepare<Record<string, unknown>>('SELECT * FROM sbv_elections WHERE id=?').all(electionId);
    }
    if (table === 'sbv_election_proposal_candidates' || table === 'sbv_election_proposal_supporters') {
      return this.database.prepare<Record<string, unknown>>(`
        SELECT child.* FROM ${table} child
        JOIN sbv_election_proposals proposal ON proposal.id=child.proposal_id
        WHERE proposal.election_id=? ORDER BY child.id
      `).all(electionId);
    }
    return this.database.prepare<Record<string, unknown>>(`
      SELECT * FROM ${table} WHERE election_id=? ORDER BY id
    `).all(electionId);
  }

  private importPayload(payload: ElectionTransferPayload): { importedElectionId: string; importedItems: ImportItem[] } {
    const idMap = new Map<string, string>();
    const importedItems: ImportItem[] = [];
    const electionRows = this.rows(payload, 'sbv_elections');
    const sourceElection = electionRows[0];
    if (!sourceElection || electionRows.length !== 1) throw new Error('Wahlaktenpaket muss genau einen Wahlvorgang enthalten.');

    const sourceElectionId = String(sourceElection.id);
    if (sourceElectionId !== payload.manifest.electionId) throw new Error('Wahlaktenmanifest verweist auf einen anderen Wahlvorgang.');
    const targetElectionId = randomUUID();
    idMap.set(sourceElectionId, targetElectionId);
    this.insertMappedRow('sbv_elections', sourceElection, { id: targetElectionId });
    importedItems.push(this.item('election', sourceElectionId, 'election', targetElectionId));

    for (const table of ELECTION_TABLES.slice(1)) {
      for (const source of this.rows(payload, table)) {
        const sourceId = String(source.id);
        const targetId = randomUUID();
        idMap.set(sourceId, targetId);
        const overrides: Record<string, unknown> = { id: targetId };
        if ('election_id' in source) overrides.election_id = targetElectionId;
        if ('proposal_id' in source) overrides.proposal_id = this.remap(idMap, source.proposal_id, 'Wahlvorschlag');
        if ('candidate_id' in source) overrides.candidate_id = this.remap(idMap, source.candidate_id, 'Kandidatur');
        if ('voter_id' in source) overrides.voter_id = this.remap(idMap, source.voter_id, 'Wahlberechtigte Person');
        if (table === 'sbv_election_board_sessions') overrides.minutes_document_id = null;
        if (table === 'sbv_election_events') {
          overrides.metadata_json_datensparsam = this.remapEventMetadata(source.metadata_json_datensparsam, idMap);
        }
        this.insertMappedRow(table, source, overrides);
        importedItems.push(this.item(table, sourceId, table, targetId));
      }
    }

    for (const source of this.rows(payload, 'deadlines')) {
      const sourceId = String(source.id);
      const targetId = randomUUID();
      idMap.set(sourceId, targetId);
      this.insertMappedRow('deadlines', source, {
        id: targetId,
        case_id: null,
        measure_id: null,
        person_id: null,
        process_id: targetElectionId,
        process_type: 'election',
        source_event: this.remapDeadlineSourceEvent(source.source_event, idMap),
      });
      importedItems.push(this.item('deadline', sourceId, 'deadline', targetId));
    }

    for (const source of this.rows(payload, 'sbv_retention_legal_holds')) {
      const sourceId = String(source.id);
      const targetId = randomUUID();
      idMap.set(sourceId, targetId);
      this.insertMappedRow('sbv_retention_legal_holds', source, {
        id: targetId,
        owner_type: 'election',
        owner_id: targetElectionId,
      });
      importedItems.push(this.item('legal_hold', sourceId, 'retention_legal_hold', targetId));
    }

    return { importedElectionId: targetElectionId, importedItems };
  }

  private rows(payload: ElectionTransferPayload, key: string): Array<Record<string, unknown>> {
    const value = payload.data[key];
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error(`Wahlaktenpaket enthält ungültige Daten für ${key}.`);
    }
    return value as Array<Record<string, unknown>>;
  }

  private insertMappedRow(table: string, source: Record<string, unknown>, overrides: Record<string, unknown>): void {
    const copy: Record<string, unknown> = { ...source, ...overrides };
    const columns = Object.keys(copy);
    if (!columns.length) throw new Error(`Wahlaktenpaket enthält leeren Datensatz für ${table}.`);
    if (columns.some((column) => !/^[a-z0-9_]+$/i.test(column))) throw new Error('Wahlaktenpaket enthält ungültige Spaltennamen.');
    this.database.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`)
      .run(...columns.map((column) => copy[column]));
  }

  private remap(idMap: Map<string, string>, sourceValue: unknown, label: string): string {
    const target = idMap.get(String(sourceValue));
    if (!target) throw new Error(`${label}-Referenz im Wahlaktenpaket ist unvollständig.`);
    return target;
  }

  private remapDeadlineSourceEvent(value: unknown, idMap: Map<string, string>): unknown {
    if (typeof value !== 'string') return value;
    const prefix = 'result.acceptance:';
    if (!value.startsWith(prefix)) return value;
    const sourceId = value.slice(prefix.length);
    return `${prefix}${idMap.get(sourceId) ?? sourceId}`;
  }

  private remapEventMetadata(value: unknown, idMap: Map<string, string>): string {
    if (typeof value !== 'string') return '{}';
    let parsed: unknown;
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error('Wahlaktenpaket enthält ungültige Ereignismetadaten.');
    }
    const visit = (current: unknown): unknown => {
      if (Array.isArray(current)) return current.map(visit);
      if (!current || typeof current !== 'object') return current;
      const mapped: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(current as Record<string, unknown>)) {
        if (typeof item === 'string' && /Id$/.test(key) && idMap.has(item)) mapped[key] = idMap.get(item)!;
        else mapped[key] = visit(item);
      }
      return mapped;
    };
    return JSON.stringify(visit(parsed));
  }

  private item(prefix: string, sourceId: string, localEntityType: string, localEntityId: string): ImportItem {
    return { packageRef: `${prefix}:${sourceId}`, localEntityType, localEntityId };
  }
}
