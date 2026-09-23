import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';
import { decryptTargetBoundTransferPayload } from './targetBoundTransferCrypto.js';
import { requireMobileOriginProof, verifyMobileTransferOrigin } from './mobileTransferOriginProof.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { ApplicationError } from '../src/domain/models/application-error.model.js';
import { MobileCompanionChangeImportStore } from './mobileCompanionChangeImportStore.js';
import { MobileCompanionReturnImportApplier } from './mobileCompanionReturnImportApplier.js';
import {
  assertMobileCompanionReturnPayload,
  assertTargetBoundReturnEnvelope,
  MOBILE_COMPANION_RETURN_FORMAT,
  MOBILE_COMPANION_RETURN_VERSION,
  safeMobileReturnSummary,
} from './mobileCompanionReturnPayload.js';
import type {
  MobileCompanionReturnChange,
  MobileCompanionReturnCompleteDeadlineChange,
  MobileCompanionReturnConflictResolution,
  MobileCompanionReturnImportResult,
  MobileCompanionReturnInspectResult,
  MobileCompanionReturnPayload,
  MobileCompanionReturnPlanItem,
} from '../src/domain/models/mobile-companion.model.js';

export { MOBILE_COMPANION_RETURN_FORMAT, MOBILE_COMPANION_RETURN_VERSION } from './mobileCompanionReturnPayload.js';

type DeviceRow = { label: string; status: string; instance_id: string; recipient_token: string; key_fingerprint: string };
type CaseRow = {
  id: string;
  case_number: string;
  display_name: string;
  status: string;
  protected_person_id: string | null;
  is_pseudonymized: number;
  is_locked: number;
};
type DeadlineRow = {
  id: string;
  case_id: string | null;
  title: string;
  status: string;
  updated_at: string;
};
type DuplicateRow = { id: string };
type SnapshotScope = {
  known: boolean;
  caseIds: Set<string>;
  deadlineIds: Set<string>;
};

export class MobileCompanionReturnService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly unitOfWork = new DatabaseUnitOfWork(database),
  ) {}

  inspectFile(filePath: string): MobileCompanionReturnInspectResult {
    return this.inspectEnvelopeText(this.readPackageFile(filePath));
  }

  inspectEnvelopeText(envelopeText: string): MobileCompanionReturnInspectResult {
    const { payload, sourceDevice } = this.decryptPayload(envelopeText);
    return this.buildPlan(payload, sourceDevice);
  }

  async importFile(filePath: string, resolutions: MobileCompanionReturnConflictResolution[] = []): Promise<MobileCompanionReturnImportResult> {
    return this.importEnvelopeText(this.readPackageFile(filePath), resolutions);
  }

  async importEnvelopeText(envelopeText: string, resolutions: MobileCompanionReturnConflictResolution[] = []): Promise<MobileCompanionReturnImportResult> {
    return this.unitOfWork.runAsync(() => {
      const { payload, sourceDevice } = this.decryptPayload(envelopeText);
      const inspection = this.buildPlan(payload, sourceDevice);
      if (!inspection.canImport) {
        throw new ApplicationError('VALIDATION_FAILED', 'Mobile-Rückgabe enthält keine sicher übernehmbare Änderung oder einen Paketfehler. Bitte den Importplan prüfen.');
      }
      const resolvedPlan = this.resolveConflicts(inspection.plan, resolutions);
      return new MobileCompanionReturnImportApplier(this.database)
        .apply(payload, sourceDevice.key_fingerprint, resolvedPlan);
    });
  }

  private readPackageFile(filePath: string): string {
    if (!path.isAbsolute(filePath)) throw new Error('Mobile-Rückgabedatei muss als geprüfte Dateiauswahl übergeben werden.');
    if (!filePath.toLowerCase().endsWith('.gsbvmobile')) throw new Error('Bitte eine Gremia.SBV-Mobile-Rückgabedatei (*.gsbvmobile) auswählen.');
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error('Mobile-Rückgabedatei ist keine reguläre Datei.');
    if (stat.size > 5_000_000) throw new Error('Mobile-Rückgabedatei ist zu groß.');
    return fs.readFileSync(filePath, 'utf8');
  }

  private decryptPayload(envelopeText: string): { payload: MobileCompanionReturnPayload; sourceDevice: DeviceRow } {
    const envelope = assertTargetBoundReturnEnvelope(JSON.parse(envelopeText));
    const proof = requireMobileOriginProof(envelope);
    const sourceDevice = this.database.prepare<DeviceRow>(
      'SELECT label, status, instance_id, recipient_token, key_fingerprint FROM mobile_companion_devices WHERE key_fingerprint = ?',
    ).get(proof.keyFingerprint);
    if (!sourceDevice || sourceDevice.status !== 'active') {
      throw new ApplicationError('VALIDATION_FAILED', 'Der Herkunftsnachweis gehört zu keinem aktiven Mobilgerät. Bitte die Kopplung prüfen.');
    }
    const identity = new TransferInstanceIdentityService(this.database).getPrivateIdentity();
    verifyMobileTransferOrigin(envelope, identity, parseTransferRecipientToken(sourceDevice.recipient_token), 'return');
    const decrypted = decryptTargetBoundTransferPayload(envelope, '', identity, {
      format: MOBILE_COMPANION_RETURN_FORMAT,
      version: MOBILE_COMPANION_RETURN_VERSION,
    });
    const payload = assertMobileCompanionReturnPayload(decrypted.payloadText);
    if (payload.sourceInstanceId !== sourceDevice.instance_id) {
      throw new ApplicationError('VALIDATION_FAILED', 'Der Herkunftsnachweis und die Quellinstanz der Rückgabe stimmen nicht überein.');
    }
    if (payload.packageId !== envelope.packageId) {
      throw new Error('Mobile-Rückgabepaket enthält widersprüchliche Paketkennungen.');
    }
    if (payload.targetInstanceId !== identity.instanceId) {
      throw new Error('Mobile-Rückgabepaket ist nicht für diese Gremia.SBV-Instanz bestimmt.');
    }
    return { payload, sourceDevice };
  }

  private buildPlan(payload: MobileCompanionReturnPayload, sourceDevice: DeviceRow): MobileCompanionReturnInspectResult {
    const snapshotScope = this.loadSnapshotScope(payload, sourceDevice);
    const plan: MobileCompanionReturnPlanItem[] = [];
    const duplicate = this.database.prepare<DuplicateRow>('SELECT id FROM case_handover_imports WHERE package_id = ?').get(payload.packageId);
    if (duplicate) {
      plan.push({
        mobileId: payload.packageId,
        type: 'create_note',
        disposition: 'rejected',
        summary: 'Mobile-Rückgabe wurde bereits importiert.',
        reason: 'duplicate_package',
      });
    }
    if (!snapshotScope.known) {
      plan.push({
        mobileId: payload.packageId,
        type: 'create_note',
        disposition: 'rejected',
        summary: 'Ausgangs-Snapshot ist dem gekoppelten Gerät nicht eindeutig zugeordnet. Bitte die Übergabe prüfen; mobile Entwürfe behalten.',
        reason: 'source_snapshot_unknown',
      });
    }
    for (const change of payload.changes) {
      const imported = new MobileCompanionChangeImportStore(this.database).find(sourceDevice.key_fingerprint, change.mobileId);
      plan.push(imported ? {
        mobileId: change.mobileId,
        type: change.type,
        disposition: 'already_done',
        summary: 'Diese mobile Änderung wurde bereits übernommen.',
        reason: 'mobile_change_already_imported',
      } : this.planChange(change, snapshotScope));
    }
    const noteCount = payload.changes.filter((change) => change.type === 'create_note').length;
    const inboxCount = payload.changes.filter((change) => change.type === 'create_inbox').length;
    const createdDeadlineCount = payload.changes.filter((change) => change.type === 'create_deadline').length;
    const completedDeadlineCount = payload.changes.filter((change) => change.type === 'complete_deadline').length;
    const conflictCount = plan.filter((item) => item.disposition === 'conflict').length;
    const rejectedCount = plan.filter((item) => item.disposition === 'rejected').length;
    const alreadyDoneCount = plan.filter((item) => item.disposition === 'already_done').length;
    const applyCount = plan.filter((item) => item.disposition === 'apply').length;
    const blockingErrorCount = plan.filter((item) => item.reason === 'duplicate_package' || item.reason === 'source_snapshot_unknown').length;
    return {
      packageId: payload.packageId,
      sourceInstanceId: payload.sourceInstanceId,
      targetInstanceId: payload.targetInstanceId,
      sourceDeviceLabel: sourceDevice.label,
      createdAt: payload.createdAt,
      noteCount,
      inboxCount,
      deadlineCount: createdDeadlineCount,
      completedDeadlineCount,
      applyCount,
      conflictCount,
      rejectedCount,
      alreadyDoneCount,
      blockingErrorCount,
      canImport: blockingErrorCount === 0 && applyCount + conflictCount > 0,
      plan,
    };
  }

  private resolveConflicts(
    plan: MobileCompanionReturnPlanItem[],
    resolutions: MobileCompanionReturnConflictResolution[],
  ): MobileCompanionReturnPlanItem[] {
    const decisions = new Map<string, MobileCompanionReturnConflictResolution['decision']>();
    for (const resolution of resolutions) {
      if (!resolution.mobileId.trim() || decisions.has(resolution.mobileId)
        || (resolution.decision !== 'apply_mobile' && resolution.decision !== 'keep_desktop')) {
        throw new ApplicationError('VALIDATION_FAILED', 'Konfliktentscheidungen sind unvollständig oder doppelt.');
      }
      decisions.set(resolution.mobileId, resolution.decision);
    }
    const conflicts = plan.filter((item) => item.disposition === 'conflict');
    if (conflicts.some((item) => !decisions.has(item.mobileId)) || decisions.size !== conflicts.length) {
      throw new ApplicationError('VALIDATION_FAILED', 'Bitte für jeden Konflikt festlegen, ob die mobile Änderung oder der Desktop-Stand gelten soll.');
    }
    const resolved = plan.map((item): MobileCompanionReturnPlanItem => {
      if (item.disposition !== 'conflict') return item;
      return { ...item, disposition: decisions.get(item.mobileId) === 'apply_mobile' ? 'apply' : 'skipped' };
    });
    return resolved;
  }

  private loadSnapshotScope(payload: MobileCompanionReturnPayload, sourceDevice: DeviceRow): SnapshotScope {
    if (!payload.sourceSnapshotPackageId) {
      return { known: false, caseIds: new Set(), deadlineIds: new Set() };
    }
    const exportRow = this.database.prepare<{ id: string; metadata_json: string }>(`
      SELECT id, metadata_json
      FROM case_handover_exports
      WHERE package_id = ?
        AND package_type = 'mobile_snapshot'
        AND target_instance_id = ?
    `).get(payload.sourceSnapshotPackageId, payload.sourceInstanceId);
    if (!exportRow) return { known: false, caseIds: new Set(), deadlineIds: new Set() };
    const metadata = JSON.parse(exportRow.metadata_json) as { targetKeyFingerprint?: unknown };
    const legacyDevices = metadata.targetKeyFingerprint === undefined
      ? this.database.prepare<{ key_fingerprint: string }>('SELECT key_fingerprint FROM mobile_companion_devices WHERE instance_id = ?').all(payload.sourceInstanceId)
      : [];
    const boundFingerprint = metadata.targetKeyFingerprint ?? (legacyDevices.length === 1 ? legacyDevices[0].key_fingerprint : undefined);
    if (boundFingerprint !== sourceDevice.key_fingerprint) return { known: false, caseIds: new Set(), deadlineIds: new Set() };
    const itemRows = this.database.prepare<{ local_entity_type: string; local_entity_id: string }>(`
      SELECT local_entity_type, local_entity_id
      FROM case_handover_export_items
      WHERE handover_export_id = ?
        AND local_entity_type IN ('case', 'deadline')
    `).all(exportRow.id);
    return {
      known: true,
      caseIds: new Set(itemRows.filter((item) => item.local_entity_type === 'case').map((item) => item.local_entity_id)),
      deadlineIds: new Set(itemRows.filter((item) => item.local_entity_type === 'deadline').map((item) => item.local_entity_id)),
    };
  }

  private planChange(change: MobileCompanionReturnChange, snapshotScope: SnapshotScope): MobileCompanionReturnPlanItem {
    if (change.type === 'complete_deadline') return this.planDeadlineCompletion(change, snapshotScope);
    if (change.type === 'create_inbox') {
      return {
        mobileId: change.mobileId,
        type: change.type,
        disposition: 'apply',
        summary: `Fallfreier mobiler Inbox-Eintrag: ${safeMobileReturnSummary(change.title)}`,
      };
    }
    if (!snapshotScope.caseIds.has(change.caseId)) {
      return this.rejected(change, 'Fallakte war nicht Bestandteil des mobilen Ausgangs-Snapshots.', 'case_not_in_snapshot');
    }
    const caseRow = this.database.prepare<CaseRow>('SELECT * FROM cases WHERE id = ?').get(change.caseId);
    if (!caseRow) {
      return this.rejected(change, 'Fallakte wurde im Desktop nicht gefunden.', 'case_missing');
    }
    if (caseRow.is_pseudonymized || caseRow.is_locked || caseRow.status === 'abgeschlossen') {
      return this.rejected(change, 'Fallakte ist abgeschlossen, gesperrt oder anonymisiert.', 'case_closed_or_locked');
    }
    return {
      mobileId: change.mobileId,
      type: change.type,
      disposition: 'apply',
      summary: change.type === 'create_note'
        ? `Neue mobile Notiz zu ${caseRow.case_number}: ${safeMobileReturnSummary(change.title)}`
        : `Neue mobile Frist zu ${caseRow.case_number}: ${safeMobileReturnSummary(change.title)}`,
      caseId: change.caseId,
    };
  }

  private planDeadlineCompletion(change: MobileCompanionReturnCompleteDeadlineChange, snapshotScope: SnapshotScope): MobileCompanionReturnPlanItem {
    if (!snapshotScope.deadlineIds.has(change.deadlineId)) {
      return this.rejected(change, 'Frist war nicht Bestandteil des mobilen Ausgangs-Snapshots.', 'deadline_not_in_snapshot');
    }
    const row = this.database.prepare<DeadlineRow>('SELECT id, case_id, title, status, updated_at FROM deadlines WHERE id = ?').get(change.deadlineId);
    if (!row) return this.rejected(change, 'Frist wurde im Desktop nicht gefunden.', 'deadline_missing');
    if (row.status === 'done' || row.status === 'erledigt') {
      return {
        mobileId: change.mobileId,
        type: change.type,
        disposition: 'already_done',
        summary: `Frist ist bereits erledigt: ${safeMobileReturnSummary(row.title)}`,
        caseId: row.case_id ?? undefined,
        deadlineId: row.id,
      };
    }
    if (row.updated_at !== change.baseUpdatedAt) {
      return {
        mobileId: change.mobileId,
        type: change.type,
        disposition: 'conflict',
        summary: `Frist wurde seit dem Mobile-Snapshot im Desktop geändert: ${safeMobileReturnSummary(row.title)}`,
        caseId: row.case_id ?? undefined,
        deadlineId: row.id,
        reason: 'deadline_changed',
        desktopState: `Desktop: Frist ist offen; zuletzt geändert am ${row.updated_at}.`,
        mobileChange: `Mobil: Frist als erledigt markieren${change.completedNote ? ' – mit Erledigungsvermerk' : ''}.`,
      };
    }
    return {
      mobileId: change.mobileId,
      type: change.type,
      disposition: 'apply',
      summary: `Frist als erledigt übernehmen: ${safeMobileReturnSummary(row.title)}`,
      caseId: row.case_id ?? undefined,
      deadlineId: row.id,
    };
  }

  private rejected(
    change: Pick<MobileCompanionReturnChange, 'mobileId' | 'type'>,
    summary: string,
    reason: string,
  ): MobileCompanionReturnPlanItem {
    return {
      mobileId: change.mobileId,
      type: change.type,
      disposition: 'rejected',
      summary,
      reason,
    };
  }

}
