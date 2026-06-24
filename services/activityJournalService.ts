import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DeadlineService } from './deadlineService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditActivityJournalChanged } from './auditEventBuilders.js';
import { ActivityJournalPreferenceService } from './activityJournalPreferenceService.js';
import type {
  ActivityJournalCategory,
  ActivityJournalConfidentialityLevel,
  ActivityJournalCreatedFrom,
  ActivityJournalEntryRecord,
  ActivityJournalExportOptions,
  ActivityJournalExportResult,
  ActivityJournalLinkRecord,
  ActivityJournalLinkTarget,
  ActivityJournalListFilter,
  ActivityJournalStatus,
  ActivityJournalSummary,
  ActivityJournalSummaryFilter,
  ActivityJournalTargetType,
  ActivityJournalTimeMode,
  CreateActivityJournalEntryInput,
  UpdateActivityJournalEntryInput,
} from '../src/app/core/models/activity-journal.model.js';
import { ACTIVITY_JOURNAL_CATEGORIES, ACTIVITY_JOURNAL_TARGET_TYPES } from '../src/app/core/models/activity-journal.model.js';

const TIME_MODES: ActivityJournalTimeMode[] = ['none', 'duration', 'range', 'timer'];
const CONFIDENTIALITY_LEVELS: ActivityJournalConfidentialityLevel[] = ['normal', 'confidential', 'highly_confidential'];
const STATUSES: ActivityJournalStatus[] = ['draft', 'final', 'follow_up_open'];
const CREATED_FROM: ActivityJournalCreatedFrom[] = ['manual', 'text_command', 'context_prefill', 'timer', 'import'];

type ActivityJournalEntryRow = {
  id: string;
  entry_date: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  time_mode: ActivityJournalTimeMode;
  category: ActivityJournalCategory;
  title: string;
  description: string | null;
  result_note: string | null;
  confidentiality_level: ActivityJournalConfidentialityLevel;
  status: ActivityJournalStatus;
  created_from: ActivityJournalCreatedFrom;
  follow_up_due_at: string | null;
  performed_outside_contract_work_time: number;
  exported_for_activity_report_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActivityJournalLinkRow = {
  id: string;
  entry_id: string;
  target_type: ActivityJournalTargetType;
  target_id: string;
  created_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function bool(value: unknown): boolean {
  return Boolean(value);
}

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDateOnly(value: unknown): string {
  const fallback = todayIsoDate();
  const trimmed = normalizeOptional(value) ?? fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
}

function normalizeIso(value: unknown): string | null {
  const trimmed = normalizeOptional(value);
  if (!trimmed) return null;
  const valueWithTime = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T09:00:00.000Z` : trimmed;
  const parsed = new Date(valueWithTime);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function normalizeDuration(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.trunc(parsed);
}

function durationFromRange(startedAt: string | null, endedAt: string | null): number | null {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

function mapLink(row: ActivityJournalLinkRow): ActivityJournalLinkRecord {
  return {
    id: row.id,
    entryId: row.entry_id,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: row.created_at
  };
}

function mapEntry(row: ActivityJournalEntryRow): ActivityJournalEntryRecord {
  return {
    id: row.id,
    entryDate: row.entry_date,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    durationMinutes: row.duration_minutes === null || row.duration_minutes === undefined ? undefined : Number(row.duration_minutes),
    timeMode: row.time_mode,
    category: row.category,
    title: row.title,
    description: row.description ?? undefined,
    resultNote: row.result_note ?? undefined,
    confidentialityLevel: row.confidentiality_level,
    status: row.status,
    createdFrom: row.created_from,
    followUpDueAt: row.follow_up_due_at ?? undefined,
    performedOutsideContractWorkTime: bool(row.performed_outside_contract_work_time),
    exportedForActivityReportAt: row.exported_for_activity_report_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertTarget(target: ActivityJournalLinkTarget): void {
  if (!ACTIVITY_JOURNAL_TARGET_TYPES.includes(target.targetType)) throw new Error(`Unzulässiger Journal-Bezug: ${target.targetType}`);
  if (!normalizeOptional(target.targetId)) throw new Error('Ein Journal-Bezug benötigt eine Ziel-ID.');
}

function hasCaseLink(links: ActivityJournalLinkRecord[]): boolean {
  return links.some((link) => link.targetType === 'case');
}

function hasControlLink(links: ActivityJournalLinkRecord[]): boolean {
  return links.some((link) => link.targetType === 'sbv_control_protocol');
}

export class ActivityJournalService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_journal_entries (
        id TEXT PRIMARY KEY,
        entry_date TEXT NOT NULL,
        started_at TEXT NULL,
        ended_at TEXT NULL,
        duration_minutes INTEGER NULL,
        time_mode TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NULL,
        result_note TEXT NULL,
        confidentiality_level TEXT NOT NULL,
        status TEXT NOT NULL,
        created_from TEXT NOT NULL,
        follow_up_due_at TEXT NULL,
        performed_outside_contract_work_time INTEGER NOT NULL DEFAULT 0,
        exported_for_activity_report_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK(time_mode IN ('none','duration','range','timer')),
        CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
        CHECK(confidentiality_level IN ('normal','confidential','highly_confidential')),
        CHECK(status IN ('draft','final','follow_up_open')),
        CHECK(created_from IN ('manual','text_command','context_prefill','timer','import')),
        CHECK(duration_minutes IS NULL OR duration_minutes >= 0),
        CHECK(performed_outside_contract_work_time IN (0,1))
      );
      CREATE TABLE IF NOT EXISTS activity_journal_links (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL REFERENCES activity_journal_entries(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK(target_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','deadline','document')),
        target_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activity_journal_category_preferences (
        context_type TEXT PRIMARY KEY CHECK(context_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','deadline','document','journal','fallfrei')),
        category TEXT NOT NULL CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_date ON activity_journal_entries(entry_date DESC, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_category ON activity_journal_entries(category, entry_date DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_status ON activity_journal_entries(status, entry_date DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_follow_up ON activity_journal_entries(follow_up_due_at);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_exported ON activity_journal_entries(exported_for_activity_report_at);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_links_entry ON activity_journal_links(entry_id);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_links_target ON activity_journal_links(target_type, target_id);
    `);
    new PersonalDataAuditLogService(this.db);
  }

  private audit(action: 'read' | 'create' | 'update' | 'delete' | 'export', entry?: ActivityJournalEntryRecord, linkCount = 0): void {
    try {
      new PersonalDataAuditLogService(this.db).append(auditActivityJournalChanged({
        action,
        entryId: entry?.id,
        category: entry?.category,
        status: entry?.status,
        entryDate: entry?.entryDate,
        linkCount,
        hasTime: Boolean(entry?.durationMinutes || entry?.startedAt || entry?.endedAt)
      }));
    } catch (error) {
      console.warn('Gremia.SBV activity journal audit write failed', error);
    }
  }

  private linkedDeadlineId(entryId: string): string | undefined {
    const row = this.db.prepare<{ id?: string }>(
      "SELECT id FROM deadlines WHERE process_type = 'activity_journal' AND process_id = ? AND source_event = 'activity_journal.follow_up' LIMIT 1"
    ).get(entryId);
    return row?.id;
  }

  private deleteLinkedDeadline(entryId: string): void {
    const deadlineId = this.linkedDeadlineId(entryId);
    if (deadlineId) this.db.prepare('DELETE FROM deadlines WHERE id = ?').run(deadlineId);
  }

  syncFollowUpDeadline(entry: ActivityJournalEntryRecord): void {
    if (!entry.followUpDueAt || entry.status === 'final') {
      this.deleteLinkedDeadline(entry.id);
      return;
    }

    const title = `Journal: ${entry.title}`;
    const description = 'Wiedervorlage aus einem SBV-Tätigkeitsjournaleintrag.';
    const deadlineId = this.linkedDeadlineId(entry.id);
    const deadlines = new DeadlineService(this.db);

    if (deadlineId) {
      deadlines.update(deadlineId, {
        title,
        description,
        dueAt: entry.followUpDueAt,
        severity: entry.status === 'follow_up_open' ? 'important' : 'normal',
        reason: 'Journal-Wiedervorlage aktualisiert'
      });
      return;
    }

    deadlines.create({
      processId: entry.id,
      processType: 'activity_journal',
      deadlineType: 'follow_up',
      title,
      description,
      dueAt: entry.followUpDueAt,
      sourceEvent: 'activity_journal.follow_up',
      severity: entry.status === 'follow_up_open' ? 'important' : 'normal',
      calculationMode: 'manual',
      isLegalDeadline: false
    });
  }

  private persistLinks(entryId: string, links: ActivityJournalLinkTarget[] = []): ActivityJournalLinkRecord[] {
    const timestamp = nowIso();
    const created: ActivityJournalLinkRecord[] = [];
    for (const target of links) {
      assertTarget(target);
      const id = randomUUID();
      this.db.prepare(`
        INSERT INTO activity_journal_links (id, entry_id, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, entryId, target.targetType, target.targetId.trim(), timestamp);
      created.push({ id, entryId, targetType: target.targetType, targetId: target.targetId.trim(), createdAt: timestamp });
    }
    return created;
  }

  createEntry(input: CreateActivityJournalEntryInput): ActivityJournalEntryRecord {
    const title = normalizeOptional(input.title);
    if (!title) throw new Error('Ein Journaleintrag benötigt einen Titel.');
    const category = normalizeEnum(input.category, ACTIVITY_JOURNAL_CATEGORIES, 'documentation');
    if (category === 'sbv_self_organization' && !normalizeOptional(input.description)) {
      throw new Error('Bei SBV-Selbstorganisation muss konkret beschrieben werden, was organisiert wurde.');
    }

    const id = randomUUID();
    const timestamp = nowIso();
    const timeMode = normalizeEnum(input.timeMode, TIME_MODES, input.durationMinutes ? 'duration' : 'none');
    const startedAt = normalizeIso(input.startedAt);
    const endedAt = normalizeIso(input.endedAt);
    const durationMinutes = timeMode === 'range'
      ? normalizeDuration(input.durationMinutes) ?? durationFromRange(startedAt, endedAt)
      : timeMode === 'none'
        ? null
        : normalizeDuration(input.durationMinutes);
    const status = normalizeEnum(input.status, STATUSES, input.followUpDueAt ? 'follow_up_open' : 'final');

    this.db.prepare(`
      INSERT INTO activity_journal_entries (
        id, entry_date, started_at, ended_at, duration_minutes, time_mode, category, title,
        description, result_note, confidentiality_level, status, created_from, follow_up_due_at,
        performed_outside_contract_work_time, exported_for_activity_report_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `).run(
      id,
      normalizeDateOnly(input.entryDate),
      startedAt,
      endedAt,
      durationMinutes,
      timeMode,
      category,
      title,
      normalizeOptional(input.description),
      normalizeOptional(input.resultNote),
      normalizeEnum(input.confidentialityLevel, CONFIDENTIALITY_LEVELS, 'confidential'),
      status,
      normalizeEnum(input.createdFrom, CREATED_FROM, 'manual'),
      normalizeIso(input.followUpDueAt),
      input.performedOutsideContractWorkTime ? 1 : 0,
      timestamp,
      timestamp
    );

    this.persistLinks(id, input.links ?? []);
    const record = this.getEntry(id)!;
    this.audit('create', record, record.links?.length ?? 0);
    this.syncFollowUpDeadline(record);
    const firstContext = input.links?.[0]?.targetType ?? 'fallfrei';
    new ActivityJournalPreferenceService(this.db).rememberCategory(firstContext, record.category);
    return record;
  }

  updateEntry(id: string, input: UpdateActivityJournalEntryInput): ActivityJournalEntryRecord {
    const existing = this.getEntry(id);
    if (!existing) throw new Error(`Journaleintrag nicht gefunden: ${id}`);
    const category = input.category !== undefined ? normalizeEnum(input.category, ACTIVITY_JOURNAL_CATEGORIES, existing.category) : existing.category;
    const title = input.title !== undefined ? normalizeOptional(input.title) : existing.title;
    if (!title) throw new Error('Ein Journaleintrag benötigt einen Titel.');
    const nextDescription = input.description !== undefined ? normalizeOptional(input.description) : existing.description ?? null;
    if (category === 'sbv_self_organization' && !nextDescription) {
      throw new Error('Bei SBV-Selbstorganisation muss konkret beschrieben werden, was organisiert wurde.');
    }

    const timeMode = input.timeMode !== undefined ? normalizeEnum(input.timeMode, TIME_MODES, existing.timeMode) : existing.timeMode;
    const startedAt = input.startedAt !== undefined ? normalizeIso(input.startedAt) : existing.startedAt ?? null;
    const endedAt = input.endedAt !== undefined ? normalizeIso(input.endedAt) : existing.endedAt ?? null;
    const durationMinutes = input.durationMinutes !== undefined
      ? normalizeDuration(input.durationMinutes)
      : timeMode === 'range'
        ? existing.durationMinutes ?? durationFromRange(startedAt, endedAt)
        : existing.durationMinutes ?? null;
    const timestamp = nowIso();

    this.db.prepare(`
      UPDATE activity_journal_entries
      SET entry_date = ?, started_at = ?, ended_at = ?, duration_minutes = ?, time_mode = ?, category = ?, title = ?,
          description = ?, result_note = ?, confidentiality_level = ?, status = ?, created_from = ?, follow_up_due_at = ?,
          performed_outside_contract_work_time = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.entryDate !== undefined ? normalizeDateOnly(input.entryDate) : existing.entryDate,
      startedAt,
      endedAt,
      timeMode === 'none' ? null : durationMinutes,
      timeMode,
      category,
      title,
      nextDescription,
      input.resultNote !== undefined ? normalizeOptional(input.resultNote) : existing.resultNote ?? null,
      input.confidentialityLevel !== undefined ? normalizeEnum(input.confidentialityLevel, CONFIDENTIALITY_LEVELS, existing.confidentialityLevel) : existing.confidentialityLevel,
      input.status !== undefined ? normalizeEnum(input.status, STATUSES, existing.status) : existing.status,
      input.createdFrom !== undefined ? normalizeEnum(input.createdFrom, CREATED_FROM, existing.createdFrom) : existing.createdFrom,
      input.followUpDueAt !== undefined ? normalizeIso(input.followUpDueAt) : existing.followUpDueAt ?? null,
      input.performedOutsideContractWorkTime !== undefined ? (input.performedOutsideContractWorkTime ? 1 : 0) : (existing.performedOutsideContractWorkTime ? 1 : 0),
      timestamp,
      id
    );

    if (input.links) {
      this.db.prepare('DELETE FROM activity_journal_links WHERE entry_id = ?').run(id);
      this.persistLinks(id, input.links);
    }

    const record = this.getEntry(id)!;
    this.audit('update', record, record.links?.length ?? 0);
    this.syncFollowUpDeadline(record);
    const firstContext = input.links?.[0]?.targetType ?? record.links?.[0]?.targetType ?? 'fallfrei';
    new ActivityJournalPreferenceService(this.db).rememberCategory(firstContext, record.category);
    return record;
  }

  deleteEntry(id: string): { deleted: boolean } {
    const existing = this.getEntry(id);
    const result = this.db.prepare('DELETE FROM activity_journal_entries WHERE id = ?').run(id) as { changes?: number };
    const deleted = Number(result.changes ?? 0) > 0;
    if (deleted) {
      this.deleteLinkedDeadline(id);
      this.audit('delete', existing, existing?.links?.length ?? 0);
    }
    return { deleted };
  }

  getEntry(id: string): ActivityJournalEntryRecord | undefined {
    const row = this.db.prepare<ActivityJournalEntryRow>('SELECT * FROM activity_journal_entries WHERE id = ?').get(id);
    if (!row) return undefined;
    const record = mapEntry(row);
    record.links = this.listLinks(id);
    return record;
  }

  listLinks(entryId: string): ActivityJournalLinkRecord[] {
    return this.db.prepare<ActivityJournalLinkRow>('SELECT * FROM activity_journal_links WHERE entry_id = ? ORDER BY created_at ASC').all(entryId).map(mapLink);
  }

  addLink(entryId: string, target: ActivityJournalLinkTarget): ActivityJournalLinkRecord {
    if (!this.getEntry(entryId)) throw new Error(`Journaleintrag nicht gefunden: ${entryId}`);
    const [created] = this.persistLinks(entryId, [target]);
    const record = this.getEntry(entryId);
    this.audit('update', record, record?.links?.length ?? 0);
    return created;
  }

  removeLink(entryId: string, linkId: string): { deleted: boolean } {
    const result = this.db.prepare('DELETE FROM activity_journal_links WHERE entry_id = ? AND id = ?').run(entryId, linkId) as { changes?: number };
    const record = this.getEntry(entryId);
    this.audit('update', record, record?.links?.length ?? 0);
    return { deleted: Number(result.changes ?? 0) > 0 };
  }

  listEntries(filter: ActivityJournalListFilter = {}): ActivityJournalEntryRecord[] {
    this.audit('read');
    let sql = 'SELECT DISTINCT e.* FROM activity_journal_entries e';
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter.targetType || filter.targetId) {
      sql += ' JOIN activity_journal_links l ON l.entry_id = e.id';
      if (filter.targetType) { where.push('l.target_type = ?'); params.push(filter.targetType); }
      if (filter.targetId) { where.push('l.target_id = ?'); params.push(filter.targetId); }
    }
    if (filter.from) { where.push('e.entry_date >= ?'); params.push(normalizeDateOnly(filter.from)); }
    if (filter.to) { where.push('e.entry_date <= ?'); params.push(normalizeDateOnly(filter.to)); }
    if (filter.categories?.length) {
      where.push(`e.category IN (${filter.categories.map(() => '?').join(', ')})`);
      params.push(...filter.categories);
    }
    if (filter.status?.length) {
      where.push(`e.status IN (${filter.status.map(() => '?').join(', ')})`);
      params.push(...filter.status);
    }
    if (filter.hasTime !== undefined) where.push(filter.hasTime ? 'e.duration_minutes IS NOT NULL' : 'e.duration_minutes IS NULL');
    if (filter.hasFollowUp !== undefined) where.push(filter.hasFollowUp ? 'e.follow_up_due_at IS NOT NULL' : 'e.follow_up_due_at IS NULL');
    const search = normalizeOptional(filter.search);
    if (search) {
      where.push('(LOWER(e.title) LIKE ? OR LOWER(COALESCE(e.description, \'\')) LIKE ? OR LOWER(COALESCE(e.result_note, \'\')) LIKE ?)');
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, like);
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY e.entry_date DESC, e.updated_at DESC';
    if (filter.limit) {
      sql += ' LIMIT ?';
      params.push(Math.min(Math.max(Math.trunc(filter.limit), 1), 500));
    }
    return this.db.prepare<ActivityJournalEntryRow>(sql).all(...params).map((row) => {
      const record = mapEntry(row);
      record.links = this.listLinks(record.id);
      return record;
    });
  }

  getSummary(filter: ActivityJournalSummaryFilter = {}): ActivityJournalSummary {
    const entries = this.listEntries({ from: filter.from, to: filter.to, categories: filter.categories, limit: 500 });
    const today = todayIsoDate();
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekStart = monday.toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const minutes = (entry: ActivityJournalEntryRecord) => entry.durationMinutes ?? 0;
    const byCategory = new Map<ActivityJournalCategory, { category: ActivityJournalCategory; count: number; minutes: number }>();
    const byReferenceType = new Map<string, { referenceType: 'case_linked' | 'control_linked' | 'fallfrei' | 'other_linked'; count: number; minutes: number }>();

    for (const entry of entries) {
      const categoryRow = byCategory.get(entry.category) ?? { category: entry.category, count: 0, minutes: 0 };
      categoryRow.count += 1;
      categoryRow.minutes += minutes(entry);
      byCategory.set(entry.category, categoryRow);

      const links = entry.links ?? [];
      const referenceType = hasCaseLink(links) ? 'case_linked' : hasControlLink(links) ? 'control_linked' : links.length ? 'other_linked' : 'fallfrei';
      const referenceRow = byReferenceType.get(referenceType) ?? { referenceType, count: 0, minutes: 0 };
      referenceRow.count += 1;
      referenceRow.minutes += minutes(entry);
      byReferenceType.set(referenceType, referenceRow);
    }

    return {
      totalEntries: entries.length,
      entriesWithTime: entries.filter((entry) => entry.durationMinutes !== undefined).length,
      totalMinutes: entries.reduce((sum, entry) => sum + minutes(entry), 0),
      todayMinutes: entries.filter((entry) => entry.entryDate === today).reduce((sum, entry) => sum + minutes(entry), 0),
      weekMinutes: entries.filter((entry) => entry.entryDate >= weekStart).reduce((sum, entry) => sum + minutes(entry), 0),
      monthMinutes: entries.filter((entry) => entry.entryDate >= monthStart).reduce((sum, entry) => sum + minutes(entry), 0),
      byCategory: [...byCategory.values()].sort((a, b) => b.minutes - a.minutes || b.count - a.count),
      byReferenceType: [...byReferenceType.values()],
      openFollowUps: entries.filter((entry) => entry.status === 'follow_up_open' || Boolean(entry.followUpDueAt)).slice(0, 20)
    };
  }

  exportEntries(
    filter: ActivityJournalListFilter = {},
    mode: 'summary' | 'detailed' = 'detailed',
    options: ActivityJournalExportOptions = {}
  ): ActivityJournalExportResult {
    const entries = this.listEntries({ ...filter, limit: 500 });
    const generatedAt = nowIso();
    const shouldMarkExported = Boolean(options.markAsExported);
    if (shouldMarkExported) {
      for (const entry of entries) {
        this.db.prepare('UPDATE activity_journal_entries SET exported_for_activity_report_at = ?, updated_at = ? WHERE id = ?').run(generatedAt, generatedAt, entry.id);
      }
    }
    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.durationMinutes ?? 0), 0);
    const notice = 'Diese Übersicht ist eine Eigenaufzeichnung der Schwerbehindertenvertretung zur Dokumentation erforderlicher Amtsaufgaben nach § 179 Abs. 4 Satz 1 SGB IX. Sie ist keine automatische Arbeitszeitabrechnung, keine Arbeitgeberfreigabe und kein Nachweis über arbeitsvertragliche Arbeitszeit.';
    const outsideWorkTimeNotice = entries.some((entry) => entry.performedOutsideContractWorkTime)
      ? 'Markierungen außerhalb regulärer Arbeitszeit sind interne Selbstdokumentation. Ein Ausgleich nach § 179 Abs. 6 SGB IX ist gesondert zu prüfen und geltend zu machen.'
      : '';
    const lines = [
      'SBV-Tätigkeitsnachweis – Eigenaufzeichnung',
      `Zeitraum: ${filter.from ?? 'offen'} bis ${filter.to ?? 'offen'}`,
      `Gesamt dokumentierte SBV-Amtszeit: ${Math.floor(totalMinutes / 60)} h ${String(totalMinutes % 60).padStart(2, '0')} min`,
      `Erstellt am: ${generatedAt}`,
      notice,
      ...(outsideWorkTimeNotice ? [outsideWorkTimeNotice] : []),
      '',
      ...entries.map((entry) => `${entry.entryDate} · ${entry.category} · ${entry.durationMinutes ?? 0} min · ${entry.title}${entry.performedOutsideContractWorkTime ? ' · außerhalb regulärer Arbeitszeit markiert' : ''}`)
    ];
    const resultEntries = entries.map((entry) => ({
      ...entry,
      exportedForActivityReportAt: shouldMarkExported ? generatedAt : entry.exportedForActivityReportAt
    }));
    if (shouldMarkExported) resultEntries.forEach((entry) => this.audit('export', entry, entry.links?.length ?? 0));
    return {
      generatedAt,
      mode,
      heading: 'SBV-Tätigkeitsnachweis – Eigenaufzeichnung',
      notice,
      totalEntries: entries.length,
      totalMinutes,
      text: mode === 'summary' ? lines.slice(0, 5).join('\n') : lines.join('\n'),
      entries: mode === 'summary' ? [] : resultEntries
    };
  }
}
