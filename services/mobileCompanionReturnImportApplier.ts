import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { CaseService } from './caseService.js';
import { DeadlineService } from './deadlineService.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import { ActivityJournalService } from './activityJournalService.js';
import { MobileCompanionChangeImportStore } from './mobileCompanionChangeImportStore.js';
import { MOBILE_COMPANION_RETURN_VERSION, uniqueMobileReturnValues } from './mobileCompanionReturnPayload.js';
import type {
  MobileCompanionReturnCreateInboxChange,
  MobileCompanionReturnCreateNoteChange,
  MobileCompanionReturnImportResult,
  MobileCompanionReturnPayload,
  MobileCompanionReturnPlanItem,
} from '../src/domain/models/mobile-companion.model.js';

export class MobileCompanionReturnImportApplier {
  constructor(private readonly database: DatabaseAdapter) {}

  async apply(
    payload: MobileCompanionReturnPayload,
    sourceKeyFingerprint: string,
    plan: MobileCompanionReturnPlanItem[],
  ): Promise<MobileCompanionReturnImportResult> {
    const planByMobileId = new Map(plan.map((item) => [item.mobileId, item]));
    const caseService = new CaseService(() => this.database);
    const deadlineService = new DeadlineService(this.database);
    const journalService = new ActivityJournalService(this.database);
    const noteCaseIds: string[] = [];
    const createdDeadlineCaseIds: string[] = [];
    const completedDeadlineCaseIds: string[] = [];
    let inboxCount = 0;
    const importedAt = new Date().toISOString();
    const handoverImportId = randomUUID();
    this.insertImport(handoverImportId, payload.packageId, importedAt);
    const importedChanges = new MobileCompanionChangeImportStore(this.database);

    for (const change of payload.changes) {
      const planned = planByMobileId.get(change.mobileId);
      if (planned?.disposition === 'skipped') {
        if (change.type !== 'complete_deadline') throw new Error('Nicht unterstützte Konfliktentscheidung.');
        importedChanges.record({
          sourceKeyFingerprint, change, localEntityType: 'deadline', localEntityId: change.deadlineId,
          handoverImportId, importedAt,
        });
        continue;
      }
      if (planned?.disposition !== 'apply') continue;
      let localEntityType: string;
      let localEntityId: string;
      if (change.type === 'create_note') {
        localEntityType = 'case_note';
        localEntityId = await this.createNote(caseService, change);
        noteCaseIds.push(change.caseId);
      } else if (change.type === 'create_inbox') {
        localEntityType = 'activity_journal_entry';
        localEntityId = this.createInboxEntry(journalService, change);
        inboxCount += 1;
      } else if (change.type === 'create_deadline') {
        localEntityType = 'deadline';
        localEntityId = deadlineService.create({
          caseId: change.caseId, processType: 'case', deadlineType: 'follow_up', title: change.title,
          description: change.description, dueAt: change.dueAt, reminderAt: change.reminderAt,
          severity: change.severity ?? 'normal', calculationMode: 'manual', isLegalDeadline: false,
          sourceEvent: 'mobile_companion_return',
        }).id;
        createdDeadlineCaseIds.push(change.caseId);
      } else {
        const deadline = deadlineService.complete(change.deadlineId, change.completedNote ?? 'Über mobile Begleit-App erledigt.');
        localEntityType = 'deadline';
        localEntityId = deadline.id;
        if (deadline.caseId) completedDeadlineCaseIds.push(deadline.caseId);
      }
      importedChanges.record({ sourceKeyFingerprint, change, localEntityType, localEntityId, handoverImportId, importedAt });
    }

    const reviewCaseIds = uniqueMobileReturnValues([...noteCaseIds, ...createdDeadlineCaseIds, ...completedDeadlineCaseIds]);
    this.createPrivacyReviews(reviewCaseIds, importedAt);
    const deadlineCount = createdDeadlineCaseIds.length + completedDeadlineCaseIds.length;
    const metadata = { packageId: payload.packageId, caseCount: reviewCaseIds.length, deadlineCount, inboxCount,
      skippedConflictCount: plan.filter((item) => item.disposition === 'skipped').length,
      result: 'success', schemaVersion: MOBILE_COMPANION_RETURN_VERSION };
    this.database.prepare('UPDATE case_handover_imports SET updated_case_count = ?, metadata_json = ? WHERE id = ?')
      .run(reviewCaseIds.length, JSON.stringify(metadata), handoverImportId);
    new PersonalDataAuditLogService(this.database).append({
      action: 'import', subjectType: 'mobile_companion_transfer', subjectId: payload.packageId,
      purpose: 'Mobile-Begleit-App-Rückgabe importiert', metadata,
    });
    return {
      imported: true, packageId: payload.packageId, createdNoteCount: noteCaseIds.length,
      createdInboxCount: inboxCount, createdDeadlineCount: createdDeadlineCaseIds.length,
      completedDeadlineCount: completedDeadlineCaseIds.length, updatedCaseIds: reviewCaseIds,
      privacyReviewCaseIds: reviewCaseIds,
      skippedConflictCount: metadata.skippedConflictCount,
    };
  }

  private insertImport(id: string, packageId: string, importedAt: string): void {
    this.database.prepare(`
      INSERT INTO case_handover_imports (
        id, package_id, imported_at, valid_until, status, mode,
        created_case_count, updated_case_count, metadata_json
      ) VALUES (?, ?, ?, NULL, 'returned', 'mobile_companion', 0, 0, '{}')
    `).run(id, packageId, importedAt);
  }

  private createPrivacyReviews(caseIds: string[], timestamp: string): void {
    const privacyReview = new PrivacyReviewService(this.database);
    privacyReview.ensureSchema();
    for (const caseId of caseIds) {
      const row = this.database.prepare<{ protected_person_id: string | null }>('SELECT protected_person_id FROM cases WHERE id = ?').get(caseId);
      privacyReview.createForCase(caseId, row?.protected_person_id ?? null, 'handover_imported',
        { mobileReturnReviewRequired: true }, timestamp, 'high');
    }
  }

  private async createNote(caseService: CaseService, change: MobileCompanionReturnCreateNoteChange): Promise<string> {
    return (await caseService.createNote({
      caseId: change.caseId, title: change.title, noteDate: change.changedAt,
      noteType: change.noteType ?? 'gespraech', participants: change.participants,
      content: change.content, nextSteps: change.nextSteps, containsHealthData: change.containsHealthData,
      confidentialLevel: 'sensibel',
    })).id;
  }

  private createInboxEntry(service: ActivityJournalService, change: MobileCompanionReturnCreateInboxChange): string {
    return service.createEntry({
      entryDate: change.changedAt.slice(0, 10), startedAt: change.changedAt, timeMode: 'none',
      category: 'consultation', title: change.title, description: change.content, resultNote: change.nextSteps,
      confidentialityLevel: change.containsHealthData === false ? 'confidential' : 'highly_confidential',
      status: 'final', createdFrom: 'import', links: [],
    }).id;
  }
}
