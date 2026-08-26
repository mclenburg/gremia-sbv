import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { RetentionDashboard, RetentionModuleSnapshot, RetentionModuleType, RetentionOperationResult, RetentionProtectedPersonSnapshot, RetentionSettings, UpdateRetentionSettingsInput } from '../src/domain/models/retention.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { DEFAULT_RETENTION_SETTINGS, buildRetentionDashboard, normalizeRetentionSettings, type RetentionActivityJournalSnapshot, type RetentionCaseSnapshot, type RetentionContactSnapshot, type RetentionDeadlineSnapshot, type RetentionDocumentSnapshot, type RetentionParticipationViolationSnapshot } from './retentionPolicy.js';
import { SearchIndexService } from './search/searchIndexService.js';
import { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import { CaseLifecycleAuditService } from './caseLifecycleAuditService.js';
import { runCaseDeletionTransaction } from './caseDeletionTransaction.js';
import { RetentionOwnerRegistry } from './retentionOwnerRegistry.js';
import { CASE_DELETE_CONFIRMATION, DatabaseRow, nowIso, bool, readNumberSetting, writeSetting, safeRun, tableExists, getColumns, latestActivityExpression, CaseDocumentFileRow, removeCaseDocumentFiles, lifecycleRowsForCase } from './retentionSupport.js';
export class RetentionService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly dataDirProvider: () => string
  ) {}

  private get db(): DatabaseAdapter {
    return this.database;
  }

  ensureSchema(db = this.database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS retention_actions (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        reference TEXT,
        reason TEXT,
        affected_rows INTEGER NOT NULL DEFAULT 0,
        affected_files INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_retention_actions_created ON retention_actions(created_at DESC);
    `);
  }

  getSettings(): RetentionSettings {
    const db = this.db;
    return normalizeRetentionSettings({
      closedCaseReviewMonths: readNumberSetting(db, 'retention.closedCaseReviewMonths', DEFAULT_RETENTION_SETTINGS.closedCaseReviewMonths),
      inactiveOpenCaseMonths: readNumberSetting(db, 'retention.inactiveOpenCaseMonths', DEFAULT_RETENTION_SETTINGS.inactiveOpenCaseMonths),
      orphanContactReviewDays: readNumberSetting(db, 'retention.orphanContactReviewDays', DEFAULT_RETENTION_SETTINGS.orphanContactReviewDays),
      completedDeadlineRetentionMonths: readNumberSetting(db, 'retention.completedDeadlineRetentionMonths', DEFAULT_RETENTION_SETTINGS.completedDeadlineRetentionMonths),
      activityJournalReviewMonths: readNumberSetting(db, 'retention.activityJournalReviewMonths', DEFAULT_RETENTION_SETTINGS.activityJournalReviewMonths),
      participationViolationReviewMonths: readNumberSetting(db, 'retention.participationViolationReviewMonths', DEFAULT_RETENTION_SETTINGS.participationViolationReviewMonths),
      minimumGroupSizeForReports: readNumberSetting(db, 'retention.minimumGroupSizeForReports', DEFAULT_RETENTION_SETTINGS.minimumGroupSizeForReports)
    });
  }

  updateSettings(input: UpdateRetentionSettingsInput): RetentionSettings {
    const next = normalizeRetentionSettings({ ...this.getSettings(), ...input });
    const db = this.db;
    writeSetting(db, 'retention.closedCaseReviewMonths', next.closedCaseReviewMonths);
    writeSetting(db, 'retention.inactiveOpenCaseMonths', next.inactiveOpenCaseMonths);
    writeSetting(db, 'retention.orphanContactReviewDays', next.orphanContactReviewDays);
    writeSetting(db, 'retention.completedDeadlineRetentionMonths', next.completedDeadlineRetentionMonths);
    writeSetting(db, 'retention.activityJournalReviewMonths', next.activityJournalReviewMonths);
    writeSetting(db, 'retention.participationViolationReviewMonths', next.participationViolationReviewMonths);
    writeSetting(db, 'retention.minimumGroupSizeForReports', next.minimumGroupSizeForReports);
    return next;
  }

  buildDashboard(): RetentionDashboard {
    const db = this.db;
    const cases = this.listCaseSnapshots(db);
    const contacts = this.listContactSnapshots(db);
    const protectedPersons = this.listProtectedPersonSnapshots(db);
    const documents = this.listDocumentSnapshots(db);
    const deadlines = this.listDeadlineSnapshots(db);
    const journalEntries = this.listActivityJournalSnapshots(db);
    const participationViolations = this.listParticipationViolationSnapshots(db);
    const officeOwners = new RetentionOwnerRegistry().listManagedSnapshots(db);
    const moduleRecords = this.listModuleRetentionSnapshots(db);
    return buildRetentionDashboard({
      settings: this.getSettings(),
      cases,
      contacts,
      protectedPersons,
      documents,
      deadlines,
      journalEntries,
      participationViolations,
      officeOwners,
      moduleRecords,
    });
  }

  private listModuleRetentionSnapshots(db: DatabaseAdapter): RetentionModuleSnapshot[] {
    const result: RetentionModuleSnapshot[] = [];
    const append = (
      table: string,
      module: RetentionModuleType,
      sql: string,
      map: (row: DatabaseRow) => Omit<RetentionModuleSnapshot, 'module'>,
    ): void => {
      if (!tableExists(db, table)) return;
      for (const row of db.prepare<DatabaseRow>(sql).all()) result.push({ module, ...map(row) });
    };
    append('recruiting_participations', 'recruiting', `
      SELECT id, vacancy_title AS title, status, COALESCE(decision_known_date, updated_at) AS completed_at
      FROM recruiting_participations WHERE status IN ('decision_known','closed')
    `, (row) => ({ id: row.id, title: row.title, status: row.status, completedAt: row.completed_at }));
    append('termination_hearings', 'termination_hearing', `
      SELECT id, case_id, status, updated_at AS completed_at FROM termination_hearings WHERE status = 'abgeschlossen'
    `, (row) => ({ id: row.id, caseId: row.case_id, title: 'Kündigungsanhörung', status: row.status, completedAt: row.completed_at }));
    append('bem_processes', 'bem', `
      SELECT id, case_id, title, status, updated_at AS completed_at, consent_withdrawn_at
      FROM bem_processes WHERE status IN ('abgeschlossen','abgelehnt','abgebrochen') OR consent_withdrawn_at IS NOT NULL
    `, (row) => ({ id: row.id, caseId: row.case_id, title: row.title || 'BEM-Verfahren', status: row.status, completedAt: row.completed_at, consentWithdrawnAt: row.consent_withdrawn_at }));
    append('prevention_processes', 'prevention', `
      SELECT id, case_id, status, updated_at AS completed_at FROM prevention_processes WHERE status = 'abgeschlossen'
    `, (row) => ({ id: row.id, caseId: row.case_id, title: 'Präventionsverfahren', status: row.status, completedAt: row.completed_at }));
    append('equalization_processes', 'equalization_gdb', `
      SELECT e.id, e.case_id, e.application_status AS status, e.updated_at AS completed_at,
        CASE WHEN c.category = 'gdb' THEN 'GdB-Verfahren' ELSE 'Gleichstellungsverfahren' END || ' · ' || c.case_number AS title
      FROM equalization_processes e
      JOIN cases c ON c.id = e.case_id
      WHERE e.application_status IN ('bewilligt','abgeschlossen')
    `, (row) => ({ id: row.id, caseId: row.case_id, title: row.title, status: row.status, completedAt: row.completed_at }));
    append('compliance_incidents', 'compliance_incident', `
      SELECT id, summary AS title, status, COALESCE(closed_at, updated_at) AS completed_at
      FROM compliance_incidents WHERE status = 'closed'
    `, (row) => ({ id: row.id, title: row.title, status: row.status, completedAt: row.completed_at }));
    if (tableExists(db, 'case_measures')) {
      const rows = db.prepare<DatabaseRow>(`
        SELECT id, case_id, title, type, status, COALESCE(closed_at, updated_at) AS completed_at
        FROM case_measures WHERE status IN ('abgeschlossen','completed','closed')
          AND type IN ('sbv_participation','workplace_accommodation','equalization_gdb')
      `).all();
      const moduleByType: Record<string, RetentionModuleType> = {
        sbv_participation: 'sbv_participation',
        workplace_accommodation: 'workplace_accommodation',
        equalization_gdb: 'equalization_gdb',
      };
      for (const row of rows) {
        const module = moduleByType[row.type];
        if (module) result.push({ module, id: row.id, caseId: row.case_id, title: row.title, status: row.status, completedAt: row.completed_at });
      }
    }
    return result;
  }

  private listCaseSnapshots(db: DatabaseAdapter): RetentionCaseSnapshot[] {
    if (!tableExists(db, 'cases')) return [];
    const activity = latestActivityExpression(db);
    const measureNoteCountExpression = tableExists(db, 'case_measure_notes')
      ? ' + (SELECT COUNT(*) FROM case_measure_notes mn WHERE mn.case_id = c.id)'
      : '';
    const rows = db.prepare<DatabaseRow>(`
      SELECT c.id, c.case_number, c.display_name, c.status, c.category, c.closed_at, c.opened_at,
        ${activity} AS last_activity_at,
        ((SELECT COUNT(*) FROM case_notes n WHERE n.case_id = c.id)${measureNoteCountExpression}) AS note_count,
        (SELECT COUNT(*) FROM case_documents d WHERE d.case_id = c.id) AS document_count,
        (SELECT COUNT(*) FROM deadlines dl WHERE dl.case_id = c.id AND dl.status IN ('open', 'offen')) AS open_deadline_count
      FROM cases c
      ORDER BY c.opened_at DESC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      caseNumber: row.case_number,
      displayName: row.display_name,
      status: row.status,
      category: row.category,
      closedAt: row.closed_at,
      openedAt: row.opened_at,
      lastActivityAt: row.last_activity_at,
      noteCount: Number(row.note_count ?? 0),
      documentCount: Number(row.document_count ?? 0),
      openDeadlineCount: Number(row.open_deadline_count ?? 0)
    }));
  }

  private listContactSnapshots(db: DatabaseAdapter): RetentionContactSnapshot[] {
    if (!tableExists(db, 'contacts')) return [];
    const rows = db.prepare<DatabaseRow>(`
      SELECT c.id, c.first_name, c.last_name, c.organization, c.created_at,
        (SELECT COUNT(*) FROM contact_text_references r WHERE r.contact_id = c.id AND r.anonymized_at IS NULL) AS reference_count
      FROM contacts c
      ORDER BY c.last_name, c.first_name
    `).all();
    return rows.map((row) => ({
      id: row.id,
      displayName: `${row.last_name}, ${row.first_name}${row.organization ? ` (${row.organization})` : ''}`,
      createdAt: row.created_at,
      referenceCount: Number(row.reference_count ?? 0)
    }));
  }

  private listProtectedPersonSnapshots(db: DatabaseAdapter): RetentionProtectedPersonSnapshot[] {
    if (!tableExists(db, 'protected_persons')) return [];
    const hasLinks = tableExists(db, 'person_case_links');
    const activeReferences = hasLinks
      ? `(
          SELECT COUNT(*) FROM cases linked_case
          WHERE linked_case.protected_person_id = p.id
            AND linked_case.person_binding_state IN ('active','migrated','anonymous_request')
        ) + (
          SELECT COUNT(*) FROM person_case_links link
          WHERE link.protected_person_id = p.id AND link.link_state = 'active'
            AND NOT EXISTS (SELECT 1 FROM cases direct_case WHERE direct_case.id = link.case_file_id AND direct_case.protected_person_id = p.id)
        )`
      : `(
          SELECT COUNT(*) FROM cases linked_case
          WHERE linked_case.protected_person_id = p.id
            AND linked_case.person_binding_state IN ('active','migrated','anonymous_request')
        )`;
    const rows = db.prepare<DatabaseRow>(`
      SELECT p.id, p.record_kind, p.pseudonym_label, p.first_name, p.last_name,
        p.created_at, p.lifecycle_state, p.protection_status, p.employment_state, p.left_company_at,
        ${activeReferences} AS active_reference_count
      FROM protected_persons p
      ORDER BY p.created_at ASC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      displayName: row.record_kind === 'pseudonymous_request'
        ? row.pseudonym_label || 'Pseudonyme Anfrage'
        : `${row.first_name} ${row.last_name}`.trim(),
      createdAt: row.created_at,
      retainedReferenceCount: Number(row.active_reference_count ?? 0),
      lifecycleState: row.lifecycle_state,
      protectionStatus: row.protection_status as RetentionProtectedPersonSnapshot['protectionStatus'],
      employmentState: row.employment_state as RetentionProtectedPersonSnapshot['employmentState'],
      leftCompanyAt: row.left_company_at,
    }));
  }

  private listDocumentSnapshots(db: DatabaseAdapter): RetentionDocumentSnapshot[] {
    if (!tableExists(db, 'case_documents')) return [];
    const rows = db.prepare<DatabaseRow>(`
      SELECT d.*, c.case_number
      FROM case_documents d
      LEFT JOIN cases c ON c.id = d.case_id
      ORDER BY d.created_at DESC
    `).all();
    const caseDocuments = rows.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      caseNumber: row.case_number,
      displayTitle: row.display_title ?? row.filename ?? row.id,
      storagePath: row.storage_path,
      hasMetadata: bool(row.storage_path) && bool(row.document_key) && bool(row.iv) && bool(row.auth_tag),
      fileExists: bool(row.storage_path) && fs.existsSync(row.storage_path),
      createdAt: row.created_at
    }));
    if (!tableExists(db, 'generated_documents')) return caseDocuments;
    const generatedRows = db.prepare<DatabaseRow>(`
      SELECT id, case_id, title, storage_path, document_key, iv, auth_tag, created_at
      FROM generated_documents
      WHERE document_kind = 'sbv_participation_violation'
      ORDER BY created_at DESC
    `).all();
    return [
      ...caseDocuments,
      ...generatedRows.map((row) => ({
        id: row.id,
        caseId: row.case_id,
        displayTitle: row.title ?? row.id,
        storagePath: row.storage_path,
        hasMetadata: bool(row.storage_path) && bool(row.document_key) && bool(row.iv) && bool(row.auth_tag),
        fileExists: bool(row.storage_path) && fs.existsSync(row.storage_path),
        createdAt: row.created_at
      }))
    ];
  }

  private listActivityJournalSnapshots(db: DatabaseAdapter): RetentionActivityJournalSnapshot[] {
    if (!tableExists(db, 'activity_journal_entries')) return [];
    const rows = db.prepare<DatabaseRow>(`
      SELECT e.id, e.title, e.entry_date, e.status, e.category, e.follow_up_due_at, e.exported_for_activity_report_at,
        EXISTS(SELECT 1 FROM activity_journal_links l WHERE l.entry_id = e.id AND l.target_type = 'case') AS case_linked,
        EXISTS(
          SELECT 1 FROM activity_journal_links l
          JOIN cases c ON c.id = l.target_id
          WHERE l.entry_id = e.id AND l.target_type = 'case' AND c.status <> 'abgeschlossen'
        ) AS linked_active_case
      FROM activity_journal_entries e
      ORDER BY e.entry_date DESC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      entryDate: row.entry_date,
      status: row.status,
      category: row.category,
      caseLinked: Boolean(row.case_linked),
      linkedActiveCase: Boolean(row.linked_active_case),
      openFollowUp: row.status === 'follow_up_open' || Boolean(row.follow_up_due_at),
      exportedForActivityReportAt: row.exported_for_activity_report_at
    }));
  }


  private listParticipationViolationSnapshots(db: DatabaseAdapter): RetentionParticipationViolationSnapshot[] {
    if (!tableExists(db, 'sbv_participation_violations')) return [];
    const rows = db.prepare<DatabaseRow>(`
      SELECT v.id, v.stage, v.status, v.subject, v.case_id, v.source_context_type, v.source_context_id, v.related_case_measure_id, v.related_recruiting_participation_id, v.related_deadline_id, v.created_at, v.updated_at, v.closed_at,
        (SELECT COUNT(*) FROM sbv_participation_violation_documents d WHERE d.violation_id = v.id) AS document_count
      FROM sbv_participation_violations v
      ORDER BY v.updated_at DESC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      stage: row.stage,
      status: row.status,
      subject: row.subject,
      caseId: row.case_id,
      sourceContextType: row.source_context_type,
      sourceContextId: row.source_context_id,
      relatedCaseMeasureId: row.related_case_measure_id,
      relatedRecruitingParticipationId: row.related_recruiting_participation_id,
      relatedDeadlineId: row.related_deadline_id,
      documentCount: Number(row.document_count ?? 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
    }));
  }

  private listDeadlineSnapshots(db: DatabaseAdapter): RetentionDeadlineSnapshot[] {
    if (!tableExists(db, 'deadlines')) return [];
    const columns = getColumns(db, 'deadlines');
    const completedAt = columns.includes('completed_at') ? 'completed_at' : 'NULL AS completed_at';
    const isLegalDeadline = columns.includes('is_legal_deadline') ? 'is_legal_deadline' : '0 AS is_legal_deadline';
    const rows = db.prepare<DatabaseRow>(`
      SELECT id, title, status, case_id, due_at, ${completedAt}, ${isLegalDeadline}
      FROM deadlines
      ORDER BY due_at DESC
    `).all();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      caseId: row.case_id,
      dueAt: row.due_at,
      completedAt: row.completed_at,
      isLegalDeadline: Boolean(row.is_legal_deadline)
    }));
  }

  async deleteCase(caseId: string, reason: string, confirmation: string): Promise<RetentionOperationResult> {
    if (confirmation !== CASE_DELETE_CONFIRMATION) {
      return { ok: false, action: 'none', error: `Bitte exakt „${CASE_DELETE_CONFIRMATION}“ eingeben.` };
    }
    const db = this.db;
    const row = db.prepare<DatabaseRow>('SELECT id, case_number FROM cases WHERE id = ?').get(caseId);
    if (!row) return { ok: false, action: 'none', error: 'Fall nicht gefunden.' };

    const documents = db.prepare<CaseDocumentFileRow>('SELECT id, storage_path FROM case_documents WHERE case_id = ?').all(caseId);
    const fileRemoval = removeCaseDocumentFiles(this.dataDirProvider(), caseId, documents);
    if (fileRemoval.errors.length) {
      return {
        ok: false,
        action: 'none',
        error: `Fall ${row.case_number} konnte nicht gelöscht werden, weil zugehörige Dokumentdateien nicht vollständig gelöscht werden konnten.`,
        affectedRows: 0,
        affectedFiles: fileRemoval.affectedFiles,
      };
    }
    let affectedRows = 0;
    const affectedFiles = fileRemoval.affectedFiles;
    const lifecycleRows = lifecycleRowsForCase(db, caseId);

    runCaseDeletionTransaction(db, {
      deleteDependentData: () => {
        const lifecycle = new MeasureLifecycleAuditService(db);
        for (const measure of lifecycleRows) {
          lifecycle.deleted(measure.measureType, measure.id, measure.caseId, measure.status, 'case_cascade');
        }
        affectedRows += safeRun(db, `DELETE FROM case_documents_fts WHERE case_id = ?`, caseId);
        if (tableExists(db, 'case_document_ocr_jobs')) {
          affectedRows += safeRun(db, `DELETE FROM case_document_ocr_jobs WHERE document_id IN (SELECT id FROM case_documents WHERE case_id = ?)`, caseId);
        }
        affectedRows += safeRun(db, `DELETE FROM case_documents WHERE case_id = ?`, caseId);
        const noteIds = db.prepare<DatabaseRow>('SELECT id FROM case_notes WHERE case_id = ?').all(caseId).map((note) => note.id);
        for (const noteId of noteIds) {
          affectedRows += safeRun(db, `DELETE FROM contact_text_references WHERE source_type = 'case_note' AND source_id = ?`, noteId);
          affectedRows += safeRun(db, `DELETE FROM case_notes_fts WHERE id = ?`, noteId);
        }
        affectedRows += safeRun(db, `DELETE FROM case_note_cases WHERE case_id = ?`, caseId);
        affectedRows += safeRun(db, `DELETE FROM case_notes WHERE case_id = ?`, caseId);
        if (tableExists(db, 'case_measure_notes')) {
          affectedRows += safeRun(db, `DELETE FROM case_measure_notes WHERE case_id = ?`, caseId);
        }
        affectedRows += safeRun(db, `DELETE FROM deadlines WHERE case_id = ?`, caseId);
      },
      appendMandatoryCaseAudit: () => {
        new CaseLifecycleAuditService(db).deleted({
          caseId,
          deletedMeasureCount: lifecycleRows.length,
          deletedDocumentCount: documents.length,
          affectedFileCount: affectedFiles,
        });
      },
      deleteCaseRecord: () => {
        affectedRows += safeRun(db, `DELETE FROM cases WHERE id = ?`, caseId);
      },
      recordRetentionAction: () => {
        this.recordAction(db, 'case_deleted', 'case', caseId, row.case_number, reason, affectedRows, affectedFiles);
      },
    });
    // Der Suchindex ist eine vollständig rekonstruierbare Projektion und gehört nicht zur fachlichen Transaktion.
    affectedRows += new SearchIndexService(db).deleteCase(caseId);
    return { ok: true, action: 'case_deleted', message: `Fall ${row.case_number} wurde gelöscht.`, affectedRows, affectedFiles };
  }

  private recordAction(db: DatabaseAdapter, actionType: string, entityType: string, entityId: string, reference: string, reason: string, affectedRows: number, affectedFiles: number): void {
    db.prepare(`
      INSERT INTO retention_actions (id, action_type, entity_type, entity_id, reference, reason, affected_rows, affected_files, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), actionType, entityType, entityId, reference, reason, affectedRows, affectedFiles, nowIso());
  }
}
