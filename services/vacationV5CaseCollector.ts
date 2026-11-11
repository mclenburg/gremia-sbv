import type { DatabaseAdapter } from './databaseService.js';
import { projectVacationV5CaseRow } from './vacationV5CaseRowPolicy.js';
import { projectVacationV5Row } from './vacationV5RowPolicy.js';
import { assertVacationV5CaseGraph, type VacationV5CaseItem, type VacationV5CaseSection,
  type VacationV5CaseSectionType } from './vacationV5CaseGraph.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';

type Row = Record<string, unknown> & { id: string };
export type VacationV5CaseSourceByRef = Record<string, { kind: VacationV5CaseSectionType; localId: string; baselineSha256: string }>;

export interface VacationV5CaseSelection {
  caseIds: readonly string[];
  measureIds?: readonly string[];
}

function section(type: VacationV5CaseSectionType, items: VacationV5CaseItem[]): VacationV5CaseSection | null {
  return items.length ? { type, schemaVersion: 1, count: items.length, items } : null;
}

function row(database: DatabaseAdapter, table: string, id: string): Row {
  const result = database.prepare<Row>(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!result) throw new Error('Ausgewählte Fallakte oder abhängiger Datensatz wurde nicht gefunden.');
  return result;
}

function collectRows(database: DatabaseAdapter, table: string, column: string, parentIds: readonly string[]): Row[] {
  if (!parentIds.length) return [];
  const placeholders = parentIds.map(() => '?').join(', ');
  return database.prepare<Row>(`SELECT * FROM ${table} WHERE ${column} IN (${placeholders}) ORDER BY created_at, id`).all(...parentIds);
}

function addSource(target: VacationV5CaseSourceByRef, ref: string, kind: VacationV5CaseSectionType, source: Row): void {
  target[ref] = { kind, localId: source.id, baselineSha256: caseHandoverBaselineHash(source) };
}

export function collectVacationV5CaseSections(database: DatabaseAdapter, selection: VacationV5CaseSelection): {
  sections: VacationV5CaseSection[]; sourceByRef: VacationV5CaseSourceByRef;
} {
  if (!Array.isArray(selection.caseIds) || !selection.caseIds.length || selection.caseIds.length > 1000
    || selection.caseIds.some((id) => typeof id !== 'string' || !id)
    || new Set(selection.caseIds).size !== selection.caseIds.length) throw new Error('Fallauswahl ist ungültig.');
  const measureFilter = selection.measureIds ?? [];
  if (!Array.isArray(measureFilter) || measureFilter.some((id) => typeof id !== 'string' || !id)
    || new Set(measureFilter).size !== measureFilter.length) throw new Error('Maßnahmenauswahl ist ungültig.');
  const sources: VacationV5CaseSourceByRef = {};
  const caseById = new Map<string, string>();
  const personById = new Map<string, string>();
  const personItems: VacationV5CaseItem[] = [];
  const caseItems = selection.caseIds.map((id, index) => {
    const source = row(database, 'cases', id);
    const ref = `case_${index + 1}`;
    caseById.set(id, ref);
    addSource(sources, ref, 'case', source);
    const links: Record<string, string> = {};
    if (source.protected_person_id) {
      const personId = String(source.protected_person_id);
      let personRef = personById.get(personId);
      if (!personRef) {
        const person = row(database, 'protected_persons', personId);
        personRef = `person_${personItems.length + 1}`;
        personById.set(personId, personRef);
        addSource(sources, personRef, 'protected_person', person);
        personItems.push({ ref: personRef, links: {}, data: projectVacationV5CaseRow('protected_person', person) });
      }
      links.protectedPersonRef = personRef;
    }
    return { ref, links, data: projectVacationV5CaseRow('case', source) };
  });

  const measureById = new Map<string, string>();
  const allMeasures = collectRows(database, 'case_measures', 'case_id', selection.caseIds);
  const selectedMeasures = measureFilter.length ? allMeasures.filter((item) => measureFilter.includes(item.id)) : allMeasures;
  if (measureFilter.length && selectedMeasures.length !== measureFilter.length) throw new Error('Ausgewählte Maßnahme gehört nicht zu den Fallakten.');
  const measureItems = selectedMeasures.map((source, index) => {
    const ref = `measure_${index + 1}`;
    measureById.set(source.id, ref);
    addSource(sources, ref, 'case_measure', source);
    return { ref, links: { caseRef: caseById.get(String(source.case_id))! }, data: projectVacationV5CaseRow('case_measure', source) };
  });

  const noteItems = collectRows(database, 'case_notes', 'case_id', selection.caseIds).map((source, index) => {
    const ref = `note_${index + 1}`;
    addSource(sources, ref, 'case_note', source);
    return { ref, links: { caseRef: caseById.get(String(source.case_id))! }, data: projectVacationV5CaseRow('case_note', source) };
  });
  const measureNoteItems = collectRows(database, 'case_measure_notes', 'case_id', selection.caseIds)
    .filter((source) => measureById.has(String(source.measure_id))).map((source, index) => {
      const ref = `measure_note_${index + 1}`;
      addSource(sources, ref, 'case_measure_note', source);
      return { ref, links: { caseRef: caseById.get(String(source.case_id))!, measureRef: measureById.get(String(source.measure_id))! },
        data: projectVacationV5CaseRow('case_measure_note', source) };
    });
  const deadlineItems = collectRows(database, 'deadlines', 'case_id', selection.caseIds)
    .filter((source) => !source.measure_id || measureById.has(String(source.measure_id))).map((source, index) => {
      if (source.person_id || source.process_id) throw new Error('Fallfrist enthält einen nicht aufgelösten Personen- oder Vorgangsbezug.');
      const ref = `case_deadline_${index + 1}`;
      addSource(sources, ref, 'case_deadline', source);
      return { ref, links: { caseRef: caseById.get(String(source.case_id))!,
        ...(source.measure_id ? { measureRef: measureById.get(String(source.measure_id))! } : {}) },
        data: projectVacationV5Row('deadline', source) };
    });
  const sections = [section('protected_person', personItems), section('case', caseItems), section('case_measure', measureItems),
    section('case_note', noteItems), section('case_measure_note', measureNoteItems), section('case_deadline', deadlineItems)]
    .filter((value): value is VacationV5CaseSection => value !== null);
  return { sections: assertVacationV5CaseGraph(sections), sourceByRef: sources };
}
