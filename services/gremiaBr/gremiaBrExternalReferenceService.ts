import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from '../databaseService.js';
import type {
  CreateGremiaBrExternalReferenceInput,
  GremiaBrExternalReferenceRecord,
  GremiaBrExternalReferenceType,
  GremiaBrInlineSuggestion,
} from '../../src/app/core/models/gremia-br.model.js';
import type { GremiaBrReadAdapter } from './gremiaBrTypes.js';
import { getGremiaBrItemDate, getGremiaBrItemId, getGremiaBrItemTitle } from './gremiaBrRelevanceService.js';

interface ExternalReferenceRow {
  id: string;
  case_id: string;
  source_system: 'gremia_br';
  source_type: GremiaBrExternalReferenceType;
  source_id: string;
  title: string;
  description?: string | null;
  source_url?: string | null;
  fetched_at: string;
  snapshot_json?: string | null;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function trimOrUndefined(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function requireText(value: unknown, label: string, maxLength = 500): string {
  const text = trimOrUndefined(value, maxLength);
  if (!text) throw new Error(`${label} fehlt.`);
  return text;
}

function parseSnapshot(json?: string | null): Record<string, unknown> | undefined {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function rowToRecord(row: ExternalReferenceRow): GremiaBrExternalReferenceRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    sourceSystem: row.source_system,
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title,
    description: row.description ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    fetchedAt: row.fetched_at,
    snapshot: parseSnapshot(row.snapshot_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeSnapshot(input: CreateGremiaBrExternalReferenceInput): string | null {
  const snapshot = {
    sourceSystem: 'gremia_br',
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    title: input.title,
    description: input.description,
    sourceUrl: input.sourceUrl,
    linkedAt: nowIso(),
  } satisfies Record<string, unknown>;
  return JSON.stringify(snapshot);
}

function getDescription(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  return trimOrUndefined(record.beschreibung ?? record.description ?? record.beschlusstext ?? record.text, 500);
}

function toInlineSuggestion(item: unknown): GremiaBrInlineSuggestion | null {
  const sourceId = getGremiaBrItemId(item);
  if (!sourceId) return null;
  const title = getGremiaBrItemTitle(item, 'BR-Beschluss');
  const date = getGremiaBrItemDate(item);
  const description = getDescription(item);
  return {
    sourceSystem: 'gremia_br',
    sourceType: 'beschluss',
    sourceId,
    title,
    description,
    date,
    label: date ? `BR-Beschluss · ${date} · ${title}` : `BR-Beschluss · ${title}`,
  };
}

export class GremiaBrExternalReferenceService {
  constructor(private readonly getDb: () => DatabaseAdapter) {}

  private db(): DatabaseAdapter {
    return this.getDb();
  }

  listForCase(caseId: string): GremiaBrExternalReferenceRecord[] {
    const normalizedCaseId = requireText(caseId, 'Fallakten-ID', 120);
    return this.db().prepare<ExternalReferenceRow>(`
      SELECT id, case_id, source_system, source_type, source_id, title, description, source_url, fetched_at, snapshot_json, created_at, updated_at
      FROM case_external_references
      WHERE case_id = ?
      ORDER BY updated_at DESC, created_at DESC
    `).all(normalizedCaseId).map(rowToRecord);
  }

  createOrUpdate(input: CreateGremiaBrExternalReferenceInput): GremiaBrExternalReferenceRecord {
    const caseId = requireText(input.caseId, 'Fallakten-ID', 120);
    const sourceType = requireText(input.sourceType, 'Quelltyp', 80) as GremiaBrExternalReferenceType;
    if (!['beschluss', 'sitzung', 'agenda', 'protokoll'].includes(sourceType)) {
      throw new Error('Dieser Gremia.BR-Quelltyp kann nicht als externe Referenz gespeichert werden.');
    }
    const sourceId = requireText(input.sourceId, 'Gremia.BR-Quell-ID', 160);
    const title = requireText(input.title, 'Titel', 500);
    const description = trimOrUndefined(input.description, 1000);
    const sourceUrl = trimOrUndefined(input.sourceUrl, 1000);
    const timestamp = nowIso();
    const id = `gremia-br-ref:${randomUUID()}`;

    this.db().prepare(`
      INSERT INTO case_external_references (
        id, case_id, source_system, source_type, source_id, title, description, source_url, fetched_at, snapshot_json, created_at, updated_at
      ) VALUES (?, ?, 'gremia_br', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(case_id, source_system, source_type, source_id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        source_url = excluded.source_url,
        fetched_at = excluded.fetched_at,
        snapshot_json = excluded.snapshot_json,
        updated_at = excluded.updated_at
    `).run(id, caseId, sourceType, sourceId, title, description ?? null, sourceUrl ?? null, timestamp, sanitizeSnapshot({ ...input, caseId, sourceType, sourceId, title, description, sourceUrl }), timestamp, timestamp);

    const row = this.db().prepare<ExternalReferenceRow>(`
      SELECT id, case_id, source_system, source_type, source_id, title, description, source_url, fetched_at, snapshot_json, created_at, updated_at
      FROM case_external_references
      WHERE case_id = ? AND source_system = 'gremia_br' AND source_type = ? AND source_id = ?
    `).get(caseId, sourceType, sourceId);
    if (!row) throw new Error('Gremia.BR-Referenz konnte nicht gespeichert werden.');
    return rowToRecord(row);
  }

  delete(referenceId: string): { deleted: boolean } {
    const id = requireText(referenceId, 'Referenz-ID', 160);
    const result = this.db().prepare('DELETE FROM case_external_references WHERE id = ?').run(id) as { changes?: number };
    return { deleted: Number(result.changes ?? 0) > 0 };
  }

  async suggestBrDecisions(adapter: GremiaBrReadAdapter, query: string): Promise<GremiaBrInlineSuggestion[]> {
    const q = requireText(query, 'Suchbegriff', 120);
    if (q.length < 2) return [];
    const raw = await adapter.suggestForInlineCommand(q);
    const suggestions = raw.map(toInlineSuggestion).filter((item): item is GremiaBrInlineSuggestion => Boolean(item));
    return suggestions.slice(0, 10);
  }
}
