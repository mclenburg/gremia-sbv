import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditSbvControlProtocolChanged } from './auditEventBuilders.js';
import type {
  CreateSbvControlProtocolInput,
  SbvControlProtocolPartner,
  SbvControlProtocolRecord,
  SbvControlProtocolStatus,
  SbvControlProtocolTopic,
  UpdateSbvControlProtocolInput,
} from '../src/app/core/models/sbv-control-protocol.model.js';

const DEFAULT_LEGAL_CONTEXT: Record<SbvControlProtocolTopic, string> = {
  workplace_rules: '§ 178 Abs. 1 Satz 1 SGB IX, § 166 SGB IX',
  inclusion_agreement: '§ 166 SGB IX, § 182 SGB IX',
  accessibility: '§ 164 Abs. 4 Satz 1 SGB IX, Art. 5 Abs. 1 lit. c DSGVO',
  procedure: '§ 178 Abs. 2 Satz 1 SGB IX',
  cooperation: '§ 182 SGB IX',
  other: '§ 178 Abs. 1 SGB IX',
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeStatus(value: unknown): SbvControlProtocolStatus {
  const allowed: SbvControlProtocolStatus[] = ['draft', 'documented', 'follow_up_open', 'closed'];
  return allowed.includes(value as SbvControlProtocolStatus) ? value as SbvControlProtocolStatus : 'documented';
}

function normalizePartner(value: unknown): SbvControlProtocolPartner {
  const allowed: SbvControlProtocolPartner[] = ['employer', 'works_council', 'joint', 'other'];
  return allowed.includes(value as SbvControlProtocolPartner) ? value as SbvControlProtocolPartner : 'employer';
}

function normalizeTopic(value: unknown): SbvControlProtocolTopic {
  const allowed: SbvControlProtocolTopic[] = ['workplace_rules', 'inclusion_agreement', 'accessibility', 'procedure', 'cooperation', 'other'];
  return allowed.includes(value as SbvControlProtocolTopic) ? value as SbvControlProtocolTopic : 'workplace_rules';
}

function mapRecord(row: any): SbvControlProtocolRecord {
  return {
    id: row.id,
    title: row.title,
    partner: row.partner,
    topic: row.topic,
    meetingAt: row.meeting_at,
    participants: row.participants ?? undefined,
    legalContext: row.legal_context ?? undefined,
    discussion: row.discussion ?? undefined,
    result: row.result ?? undefined,
    nextSteps: row.next_steps ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SbvControlProtocolService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_control_protocols (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        partner TEXT NOT NULL,
        topic TEXT NOT NULL,
        meeting_at TEXT NOT NULL,
        participants TEXT,
        legal_context TEXT,
        discussion TEXT,
        result TEXT,
        next_steps TEXT,
        status TEXT NOT NULL DEFAULT 'documented',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_partner ON sbv_control_protocols(partner);
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_topic ON sbv_control_protocols(topic);
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_status ON sbv_control_protocols(status);
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_meeting ON sbv_control_protocols(meeting_at DESC);
    `);
    new PersonalDataAuditLogService(this.db);
  }

  private audit(action: 'read' | 'create' | 'update' | 'delete', subjectId?: string, topic?: string, status?: string): void {
    try {
      new PersonalDataAuditLogService(this.db).append(auditSbvControlProtocolChanged({ action, protocolId: subjectId, topic, status }));
    } catch (error) {
      console.warn('Gremia.SBV control protocol audit write failed', error);
    }
  }

  list(): SbvControlProtocolRecord[] {
    this.audit('read');
    return this.db.prepare<any>(`
      SELECT * FROM sbv_control_protocols
      ORDER BY meeting_at DESC, updated_at DESC
    `).all().map(mapRecord);
  }

  create(input: CreateSbvControlProtocolInput): SbvControlProtocolRecord {
    const title = normalizeOptional(input.title);
    if (!title) throw new Error('Ein Steuerungsprotokoll benötigt einen Titel.');
    const topic = normalizeTopic(input.topic);
    const status = normalizeStatus(input.status);
    const timestamp = nowIso();
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO sbv_control_protocols (
        id, title, partner, topic, meeting_at, participants, legal_context,
        discussion, result, next_steps, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      normalizePartner(input.partner),
      topic,
      normalizeOptional(input.meetingAt) ?? timestamp,
      normalizeOptional(input.participants),
      normalizeOptional(input.legalContext) ?? DEFAULT_LEGAL_CONTEXT[topic],
      normalizeOptional(input.discussion),
      normalizeOptional(input.result),
      normalizeOptional(input.nextSteps),
      status,
      timestamp,
      timestamp,
    );
    this.audit('create', id, topic, status);
    return this.getById(id)!;
  }

  update(id: string, input: UpdateSbvControlProtocolInput): SbvControlProtocolRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Steuerungsprotokoll nicht gefunden: ${id}`);
    const topic = input.topic !== undefined ? normalizeTopic(input.topic) : existing.topic;
    const title = input.title !== undefined ? normalizeOptional(input.title) : existing.title;
    if (!title) throw new Error('Ein Steuerungsprotokoll benötigt einen Titel.');
    const status = input.status !== undefined ? normalizeStatus(input.status) : existing.status;
    const timestamp = nowIso();
    this.db.prepare(`
      UPDATE sbv_control_protocols
      SET title = ?, partner = ?, topic = ?, meeting_at = ?, participants = ?, legal_context = ?,
          discussion = ?, result = ?, next_steps = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title,
      input.partner !== undefined ? normalizePartner(input.partner) : existing.partner,
      topic,
      input.meetingAt !== undefined ? normalizeOptional(input.meetingAt) ?? existing.meetingAt : existing.meetingAt,
      input.participants !== undefined ? normalizeOptional(input.participants) : existing.participants ?? null,
      input.legalContext !== undefined ? normalizeOptional(input.legalContext) ?? DEFAULT_LEGAL_CONTEXT[topic] : existing.legalContext ?? DEFAULT_LEGAL_CONTEXT[topic],
      input.discussion !== undefined ? normalizeOptional(input.discussion) : existing.discussion ?? null,
      input.result !== undefined ? normalizeOptional(input.result) : existing.result ?? null,
      input.nextSteps !== undefined ? normalizeOptional(input.nextSteps) : existing.nextSteps ?? null,
      status,
      timestamp,
      id,
    );
    this.audit('update', id, topic, status);
    return this.getById(id)!;
  }

  delete(id: string): { deleted: boolean } {
    const result = this.db.prepare('DELETE FROM sbv_control_protocols WHERE id = ?').run(id) as { changes?: number };
    const deleted = Number(result.changes ?? 0) > 0;
    if (deleted) this.audit('delete', id);
    return { deleted };
  }

  getById(id: string): SbvControlProtocolRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM sbv_control_protocols WHERE id = ?').get(id);
    return row ? mapRecord(row) : undefined;
  }
}
