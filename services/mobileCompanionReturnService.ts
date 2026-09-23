import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';
import { decryptTargetBoundTransferPayload } from './targetBoundTransferCrypto.js';
import { requireMobileOriginProof, verifyMobileTransferOrigin } from './mobileTransferOriginProof.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { ApplicationError } from '../src/domain/models/application-error.model.js';
import { CaseService } from './caseService.js';
import { DeadlineService } from './deadlineService.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import { ActivityJournalService } from './activityJournalService.js';
import {
  assertMobileCompanionReturnPayload,
  assertTargetBoundReturnEnvelope,
  MOBILE_COMPANION_RETURN_FORMAT,
  MOBILE_COMPANION_RETURN_VERSION,
  safeMobileReturnSummary,
  uniqueMobileReturnValues,
} from './mobileCompanionReturnPayload.js';
import type {
  MobileCompanionReturnChange,
  MobileCompanionReturnCreateInboxChange,
  MobileCompanionReturnCreateNoteChange,
  MobileCompanionReturnCompleteDeadlineChange,
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

function nowIso(): string {
  return new Date().toISOString();
}

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

  async importFile(filePath: string): Promise<MobileCompanionReturnImportResult> {
    return this.importEnvelopeText(this.readPackageFile(filePath));
  }

  async importEnvelopeText(envelopeText: string): Promise<MobileCompanionReturnImportResult> {
    return this.unitOfWork.runAsync(() => {
      const { payload, sourceDevice } = this.decryptPayload(envelopeText);
      const inspection = this.buildPlan(payload, sourceDevice);
      if (!inspection.canImport) {
        throw new ApplicationError('VALIDATION_FAILED', 'Mobile-Rückgabe enthält Konflikte oder nicht übernehmbare Änderungen. Bitte zuerst den Importplan prüfen.');
      }
      return this.applyPayload(payload, inspection.plan);
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
      plan.push(this.planChange(change, snapshotScope));
    }
    const noteCount = payload.changes.filter((change) => change.type === 'create_note').length;
    const inboxCount = payload.changes.filter((change) => change.type === 'create_inbox').length;
    const createdDeadlineCount = payload.changes.filter((change) => change.type === 'create_deadline').length;
    const completedDeadlineCount = payload.changes.filter((change) => change.type === 'complete_deadline').length;
    const conflictCount = plan.filter((item) => item.disposition === 'conflict').length;
    const rejectedCount = plan.filter((item) => item.disposition === 'rejected').length;
    const alreadyDoneCount = plan.filter((item) => item.disposition === 'already_done').length;
    const applyCount = plan.filter((item) => item.disposition === 'apply').length;
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
      canImport: applyCount > 0 && conflictCount === 0 && rejectedCount === 0,
      plan,
    };
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

  private async applyPayload(
    payload: MobileCompanionReturnPayload,
    plan: MobileCompanionReturnPlanItem[],
  ): Promise<MobileCompanionReturnImportResult> {
    const applyIds = new Set(plan.filter((item) => item.disposition === 'apply').map((item) => item.mobileId));
    const caseService = new CaseService(() => this.database);
    const deadlineService = new DeadlineService(this.database);
    const activityJournalService = new ActivityJournalService(this.database);
    const createdNoteCaseIds: string[] = [];
    let createdInboxCount = 0;
    const createdDeadlineCaseIds: string[] = [];
    const completedDeadlineCaseIds: string[] = [];
    for (const change of payload.changes) {
      if (!applyIds.has(change.mobileId)) continue;
      if (change.type === 'create_note') {
        await this.createNote(caseService, change);
        createdNoteCaseIds.push(change.caseId);
      } else if (change.type === 'create_inbox') {
        this.createInboxEntry(activityJournalService, change);
        createdInboxCount += 1;
      } else if (change.type === 'create_deadline') {
        deadlineService.create({
          caseId: change.caseId,
          processType: 'case',
          deadlineType: 'follow_up',
          title: change.title,
          description: change.description,
          dueAt: change.dueAt,
          reminderAt: change.reminderAt,
          severity: change.severity ?? 'normal',
          calculationMode: 'manual',
          isLegalDeadline: false,
          sourceEvent: 'mobile_companion_return',
        });
        createdDeadlineCaseIds.push(change.caseId);
      } else {
        const deadline = deadlineService.complete(change.deadlineId, change.completedNote ?? 'Über mobile Begleit-App erledigt.');
        if (deadline.caseId) completedDeadlineCaseIds.push(deadline.caseId);
      }
    }
    const privacyReviewCaseIds = uniqueMobileReturnValues([...createdNoteCaseIds, ...createdDeadlineCaseIds, ...completedDeadlineCaseIds]);
    const privacyReview = new PrivacyReviewService(this.database);
    privacyReview.ensureSchema();
    const timestamp = nowIso();
    for (const caseId of privacyReviewCaseIds) {
      const row = this.database.prepare<{ protected_person_id: string | null }>('SELECT protected_person_id FROM cases WHERE id = ?').get(caseId);
      privacyReview.createForCase(caseId, row?.protected_person_id ?? null, 'handover_imported', { mobileReturnReviewRequired: true }, timestamp, 'high');
    }
    this.database.prepare(`
      INSERT INTO case_handover_imports (
        id, package_id, imported_at, valid_until, status, mode,
        created_case_count, updated_case_count, metadata_json
      ) VALUES (?, ?, ?, NULL, 'returned', 'mobile_companion', 0, ?, ?)
    `).run(randomUUID(), payload.packageId, timestamp, privacyReviewCaseIds.length, JSON.stringify({
      packageId: payload.packageId,
      caseCount: privacyReviewCaseIds.length,
      deadlineCount: createdDeadlineCaseIds.length + completedDeadlineCaseIds.length,
      inboxCount: createdInboxCount,
      result: 'success',
      schemaVersion: MOBILE_COMPANION_RETURN_VERSION,
    }));
    new PersonalDataAuditLogService(this.database).append({
      action: 'import',
      subjectType: 'mobile_companion_transfer',
      subjectId: payload.packageId,
      purpose: 'Mobile-Begleit-App-Rückgabe importiert',
      metadata: {
        packageId: payload.packageId,
        caseCount: privacyReviewCaseIds.length,
        deadlineCount: createdDeadlineCaseIds.length + completedDeadlineCaseIds.length,
        inboxCount: createdInboxCount,
        result: 'success',
        schemaVersion: MOBILE_COMPANION_RETURN_VERSION,
      },
    });
    return {
      imported: true,
      packageId: payload.packageId,
      createdNoteCount: createdNoteCaseIds.length,
      createdInboxCount,
      createdDeadlineCount: createdDeadlineCaseIds.length,
      completedDeadlineCount: completedDeadlineCaseIds.length,
      updatedCaseIds: privacyReviewCaseIds,
      privacyReviewCaseIds,
    };
  }

  private async createNote(
    caseService: CaseService,
    change: MobileCompanionReturnCreateNoteChange,
  ): Promise<void> {
    await caseService.createNote({
      caseId: change.caseId,
      title: change.title,
      noteDate: change.changedAt,
      noteType: change.noteType ?? 'gespraech',
      participants: change.participants,
      content: change.content,
      nextSteps: change.nextSteps,
      containsHealthData: change.containsHealthData,
      confidentialLevel: 'sensibel',
    });
  }

  private createInboxEntry(
    activityJournalService: ActivityJournalService,
    change: MobileCompanionReturnCreateInboxChange,
  ): void {
    activityJournalService.createEntry({
      entryDate: change.changedAt.slice(0, 10),
      startedAt: change.changedAt,
      timeMode: 'none',
      category: 'consultation',
      title: change.title,
      description: change.content,
      resultNote: change.nextSteps,
      confidentialityLevel: change.containsHealthData === false ? 'confidential' : 'highly_confidential',
      status: 'final',
      createdFrom: 'import',
      links: [],
    });
  }
}
