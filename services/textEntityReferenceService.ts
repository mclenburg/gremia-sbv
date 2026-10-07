import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';

export type TextEntityKind = 'person' | 'case';

interface ReferenceRow { marker: string; }
interface TableRow { name: string; type: string; }
interface ColumnRow { name: string; type: string; pk: number; }

const REDACTION = '[anonymisiert]';
const IMMUTABLE_TABLE = /(?:^|_)(?:audit|log|ledger)(?:_|$)/;

function identifier(value: string): string {
  if (!/^[a-z_][a-z_0-9]*$/i.test(value)) throw new Error('Ungültiger Datenbankbezeichner.');
  return `"${value}"`;
}

function displayLabel(value: string): string {
  return value.replace(/[\[\]\r\n\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function entityLabel(db: DatabaseAdapter, kind: TextEntityKind, id: string): string {
  if (kind === 'person') {
    const row = db.prepare<{ first_name: string | null; last_name: string | null; pseudonym_label: string | null; lifecycle_state: string | null }>(
      'SELECT first_name, last_name, pseudonym_label, lifecycle_state FROM protected_persons WHERE id = ?',
    ).get(id);
    if (!row || row.lifecycle_state === 'anonymized' || row.lifecycle_state === 'deleted_marker') throw new Error('Person ist nicht mehr verknüpfbar.');
    return displayLabel([row.first_name, row.last_name].filter(Boolean).join(' ') || row.pseudonym_label || 'Person');
  }
  const row = db.prepare<{ case_number: string; anonymized_at: string | null }>(
    'SELECT case_number, anonymized_at FROM cases WHERE id = ?',
  ).get(id);
  if (!row || row.anonymized_at) throw new Error('Fall ist nicht mehr verknüpfbar.');
  return displayLabel(row.case_number);
}

function referenceTableExists(db: DatabaseAdapter): boolean {
  return Boolean(db.prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'text_entity_references'").get());
}

export class TextEntityReferenceService {
  constructor(private readonly database: DatabaseAdapter) {}

  replaceForTarget(kind: TextEntityKind, id: string, value: string): string {
    if (!referenceTableExists(this.database)) return value;
    const references = this.database.prepare<ReferenceRow>(
      'SELECT marker FROM text_entity_references WHERE entity_kind = ? AND entity_id = ?',
    ).all(kind, id);
    return references.reduce((text, reference) => text.replaceAll(reference.marker, REDACTION), value);
  }

  create(kind: TextEntityKind, id: string): string {
    return new DatabaseUnitOfWork(this.database).run(() => {
      const label = entityLabel(this.database, kind, id);
      if (!label) throw new Error('Verknüpfung ohne Bezeichnung ist nicht möglich.');
      const prefix = kind === 'person' ? 'Person' : 'Fall';
      const base = `${prefix}: ${label}`;
      const existing = this.database.prepare<ReferenceRow>(
        'SELECT marker FROM text_entity_references WHERE entity_kind = ? AND entity_id = ? AND label = ? ORDER BY created_at, id LIMIT 1',
      ).get(kind, id, label);
      if (existing) return existing.marker;

      let marker = `[[${base}]]`;
      let number = 2;
      while (this.database.prepare<ReferenceRow>('SELECT marker FROM text_entity_references WHERE marker = ?').get(marker)) {
        marker = `[[${base} (${number})]]`;
        number += 1;
      }
      this.database.prepare('INSERT INTO text_entity_references (id, entity_kind, entity_id, label, marker, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), kind, id, label, marker, new Date().toISOString());
      return marker;
    });
  }

  redact(kind: TextEntityKind, id: string): number {
    if (!referenceTableExists(this.database)) return 0;
    const references = this.database.prepare<ReferenceRow>(
      'SELECT marker FROM text_entity_references WHERE entity_kind = ? AND entity_id = ?',
    ).all(kind, id);
    if (!references.length) return 0;

    const tables = this.database.prepare<TableRow>("SELECT name, type FROM pragma_table_list WHERE schema = 'main' AND type IN ('table', 'virtual')").all();
    let changed = 0;
    const timestamp = new Date().toISOString();
    for (const table of tables) {
      if (table.name === 'text_entity_references' || table.name.startsWith('sqlite_') || table.name.startsWith('schema_')) continue;
      const columns = this.database.prepare<ColumnRow>(`PRAGMA table_info(${identifier(table.name)})`).all();
      const hasUpdatedAt = table.type === 'table' && columns.some((column) => column.name === 'updated_at');
      for (const column of columns) {
        if (column.pk || column.name === 'updated_at') continue;
        if (table.type !== 'virtual' && !/CHAR|CLOB|TEXT/i.test(column.type)) continue;
        const tableName = identifier(table.name);
        const columnName = identifier(column.name);
        for (const { marker } of references) {
          const present = this.database.prepare<{ found: number }>(
            `SELECT 1 AS found FROM ${tableName} WHERE instr(${columnName}, ?) > 0 LIMIT 1`,
          ).get(marker);
          if (!present) continue;
          if (IMMUTABLE_TABLE.test(table.name)) throw new Error(`Verknüpfung in unveränderlichem Nachweis ${table.name} gefunden.`);
          const result = this.database.prepare(
            `UPDATE ${tableName} SET ${columnName} = replace(${columnName}, ?, ?)${hasUpdatedAt ? ', updated_at = ?' : ''} WHERE instr(${columnName}, ?) > 0`,
          ).run(...(hasUpdatedAt ? [marker, REDACTION, timestamp, marker] : [marker, REDACTION, marker])) as { changes?: number };
          changed += Number(result.changes ?? 0);
        }
      }
    }
    this.database.prepare('DELETE FROM text_entity_references WHERE entity_kind = ? AND entity_id = ?').run(kind, id);
    return changed;
  }
}
