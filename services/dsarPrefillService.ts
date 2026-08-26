import type { DatabaseAdapter } from './databaseService.js';
import type { DataSubjectAccessPrefill, DataSubjectAccessPrefillCase, DataSubjectAccessPrefillDeadline, DataSubjectAccessPrefillFreeTextMatch, DataSubjectAccessPrefillImportRun, DataSubjectAccessPrefillLifecycleEvent, DataSubjectAccessPrefillMeasure, DataSubjectAccessPrefillPerson, DataSubjectAccessRequestInput } from '../src/domain/models/compliance.model.js';
import { DatabaseRow, nowIso, optional, unique, hasTable, searchTokens, nameVariants, allSearchTerms, placeholders, textOf, matchedTermsIn, excerpt, mapPerson, mapLegacyPerson, mapCase, mapDeadline, mapMeasure, mapImport, mapLifecycle, FreeTextSource, linkedCaseExpression, linkedCaseJoin, hasLinkedCase, FREE_TEXT_SOURCES } from './dsarPrefillSupport.js';
export class DsarPrefillService {
  constructor(private readonly database: DatabaseAdapter) {}

  buildPrefill(input: DataSubjectAccessRequestInput): DataSubjectAccessPrefill {
    const tokens = searchTokens(input);
    const terms = allSearchTerms(input);
    const persons = this.findPersons(input, tokens);
    const protectedPersonIds = persons.filter((person) => person.recordKind !== 'legacy_person').map((person) => person.id);
    const legacyPersonIds = persons.filter((person) => person.recordKind === 'legacy_person').map((person) => person.id);
    const cases = this.findCases(input, tokens, protectedPersonIds, legacyPersonIds);
    const directFreeTextMatches = this.findFreeTextMatches(terms, cases.map((item) => item.id));
    const allCaseIds = unique([...cases.map((item) => item.id), ...directFreeTextMatches.map((item) => item.caseId)]);
    const allCases = this.mergeCases(cases, this.findCasesByIds(allCaseIds));
    const caseIds = allCases.map((item) => item.id);
    const linkedCaseFreeTextMatches = this.findLinkedCaseFreeTextMatches(caseIds, directFreeTextMatches.map((item) => item.id));
    const freeTextMatches = [...directFreeTextMatches, ...linkedCaseFreeTextMatches].slice(0, 160);
    const measures = this.findMeasures(caseIds);
    const deadlines = this.findDeadlines(protectedPersonIds, legacyPersonIds, caseIds, measures.map((item) => item.id));
    const importRuns = this.findImportRuns(protectedPersonIds);
    const lifecycleEvents = this.findLifecycleEvents(protectedPersonIds, legacyPersonIds, caseIds);

    return {
      generatedAt: nowIso(),
      matchReason: this.matchReason(input, tokens, persons.length, allCases.length, freeTextMatches.length),
      persons,
      cases: allCases,
      deadlines,
      measures,
      importRuns,
      lifecycleEvents,
      freeTextMatches,
    };
  }

  private matchReason(input: DataSubjectAccessRequestInput, tokens: string[], personCount: number, caseCount: number, freeTextCount: number): string {
    if (!tokens.length) return 'Keine Suchangaben vorhanden; es wurden keine personenbezogenen Datensätze automatisch vorbefüllt.';
    const parts = [];
    if (input.requesterName.trim()) parts.push(`Name: ${input.requesterName.trim()} (inkl. Vorname-/Nachname-Einzelsuche)`);
    if (input.caseReference.trim()) parts.push(`Fall-/Aktenbezug: ${input.caseReference.trim()}`);
    return `Automatische Vorbefüllung anhand ${parts.join(' · ')}. Treffer: ${personCount} Personenstamm/Personenstämme, ${caseCount} Fallakte(n), ${freeTextCount} Freitext-Fundstelle(n).`;
  }

  private findPersons(input: DataSubjectAccessRequestInput, tokens: string[]): DataSubjectAccessPrefillPerson[] {
    const rowsByKey = new Map<string, DataSubjectAccessPrefillPerson>();
    const terms = unique([...nameVariants(input), ...tokens]);
    if (!terms.length) return [];

    if (hasTable(this.database, 'protected_persons')) {
      const lowerName = input.requesterName.trim().toLowerCase();
      const whereParts: string[] = [];
      const params: string[] = [];
      if (lowerName) {
        whereParts.push(`lower(trim(first_name || ' ' || last_name)) = ?`);
        params.push(lowerName);
        whereParts.push(`lower(trim(last_name || ' ' || first_name)) = ?`);
        params.push(lowerName);
        whereParts.push(`lower(coalesce(pseudonym_label, '')) = ?`);
        params.push(lowerName);
      }
      for (const token of terms) {
        const like = `%${token.toLowerCase()}%`;
        whereParts.push(`lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(pseudonym_label, '') || ' ' || coalesce(personnel_number, '') || ' ' || coalesce(work_email, '') || ' ' || coalesce(notes, '')) LIKE ?`);
        params.push(like);
      }
      const rows = whereParts.length ? this.database.prepare<DatabaseRow>(`
        SELECT * FROM protected_persons
        WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
        ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE, created_at DESC
        LIMIT 40
      `).all(...params).map(mapPerson) : [];
      rows.forEach((row) => rowsByKey.set(`protected:${row.id}`, row));
    }

    if (hasTable(this.database, 'persons')) {
      const whereParts: string[] = [];
      const params: string[] = [];
      const lowerName = input.requesterName.trim().toLowerCase();
      if (lowerName) {
        whereParts.push(`lower(trim(first_name || ' ' || last_name)) = ?`);
        params.push(lowerName);
        whereParts.push(`lower(trim(last_name || ' ' || first_name)) = ?`);
        params.push(lowerName);
        whereParts.push(`lower(coalesce(display_name, '')) = ?`);
        params.push(lowerName);
      }
      for (const token of terms) {
        const like = `%${token.toLowerCase()}%`;
        whereParts.push(`lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(department, '') || ' ' || coalesce(notes, '')) LIKE ?`);
        params.push(like);
      }
      const rows = whereParts.length ? this.database.prepare<DatabaseRow>(`
        SELECT * FROM persons
        WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
        ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE, updated_at DESC
        LIMIT 40
      `).all(...params).map(mapLegacyPerson) : [];
      rows.forEach((row) => rowsByKey.set(`legacy:${row.id}`, row));
    }

    return Array.from(rowsByKey.values()).slice(0, 80);
  }

  private findCases(input: DataSubjectAccessRequestInput, tokens: string[], protectedPersonIds: string[], legacyPersonIds: string[]): DataSubjectAccessPrefillCase[] {
    if (!hasTable(this.database, 'cases')) return [];
    const rowsById = new Map<string, DataSubjectAccessPrefillCase>();
    if (protectedPersonIds.length && hasTable(this.database, 'person_case_links')) {
      const rows = this.database.prepare<DatabaseRow>(`
        SELECT DISTINCT c.* FROM cases c
        LEFT JOIN person_case_links pcl ON pcl.case_file_id = c.id AND pcl.link_state = 'active'
        WHERE c.protected_person_id IN (${placeholders(protectedPersonIds)}) OR pcl.protected_person_id IN (${placeholders(protectedPersonIds)})
        ORDER BY c.opened_at DESC
        LIMIT 80
      `).all(...protectedPersonIds, ...protectedPersonIds).map(mapCase);
      rows.forEach((row) => rowsById.set(row.id, row));
    } else if (protectedPersonIds.length) {
      const rows = this.database.prepare<DatabaseRow>(`
        SELECT DISTINCT * FROM cases
        WHERE protected_person_id IN (${placeholders(protectedPersonIds)})
        ORDER BY opened_at DESC
        LIMIT 80
      `).all(...protectedPersonIds).map(mapCase);
      rows.forEach((row) => rowsById.set(row.id, row));
    }

    if (legacyPersonIds.length) {
      const rows = this.database.prepare<DatabaseRow>(`
        SELECT DISTINCT * FROM cases
        WHERE person_id IN (${placeholders(legacyPersonIds)})
        ORDER BY opened_at DESC
        LIMIT 80
      `).all(...legacyPersonIds).map(mapCase);
      rows.forEach((row) => rowsById.set(row.id, row));
    }

    const caseReference = input.caseReference.trim();
    const terms = unique([caseReference, ...tokens]);
    if (terms.length) {
      const whereParts: string[] = [];
      const params: string[] = [];
      for (const token of terms) {
        const like = `%${token.toLowerCase()}%`;
        whereParts.push(`lower(coalesce(case_number, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(privacy_review_reason, '')) LIKE ?`);
        params.push(like);
      }
      if (whereParts.length) {
        const rows = this.database.prepare<DatabaseRow>(`
          SELECT * FROM cases
          WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
          ORDER BY opened_at DESC
          LIMIT 80
        `).all(...params).map(mapCase);
        rows.forEach((row) => rowsById.set(row.id, row));
      }
    }
    return Array.from(rowsById.values()).slice(0, 100);
  }

  private findCasesByIds(caseIds: string[]): DataSubjectAccessPrefillCase[] {
    if (!caseIds.length || !hasTable(this.database, 'cases')) return [];
    return this.database.prepare<DatabaseRow>(`
      SELECT * FROM cases
      WHERE id IN (${placeholders(caseIds)})
      ORDER BY opened_at DESC
      LIMIT 100
    `).all(...caseIds).map(mapCase);
  }

  private mergeCases(primary: DataSubjectAccessPrefillCase[], secondary: DataSubjectAccessPrefillCase[]): DataSubjectAccessPrefillCase[] {
    const byId = new Map<string, DataSubjectAccessPrefillCase>();
    [...primary, ...secondary].forEach((item) => byId.set(item.id, item));
    return Array.from(byId.values()).slice(0, 100);
  }

  private findFreeTextMatches(terms: string[], knownCaseIds: string[]): DataSubjectAccessPrefillFreeTextMatch[] {
    if (!terms.length) return [];
    const matches: DataSubjectAccessPrefillFreeTextMatch[] = [];
    for (const source of FREE_TEXT_SOURCES) {
      matches.push(...this.findFreeTextMatchesInSource(source, terms, 'name_or_reference', knownCaseIds));
      if (matches.length >= 120) break;
    }
    return this.dedupeFreeTextMatches(matches).slice(0, 120);
  }

  private findLinkedCaseFreeTextMatches(caseIds: string[], existingIds: string[]): DataSubjectAccessPrefillFreeTextMatch[] {
    if (!caseIds.length) return [];
    const existing = new Set(existingIds);
    const matches: DataSubjectAccessPrefillFreeTextMatch[] = [];
    for (const source of FREE_TEXT_SOURCES.filter(hasLinkedCase)) {
      matches.push(...this.findLinkedCaseFreeTextMatchesInSource(source, caseIds, existing));
      if (matches.length >= 80) break;
    }
    return this.dedupeFreeTextMatches(matches).slice(0, 80);
  }

  private findFreeTextMatchesInSource(source: FreeTextSource, terms: string[], matchKind: DataSubjectAccessPrefillFreeTextMatch['matchKind'], knownCaseIds: string[]): DataSubjectAccessPrefillFreeTextMatch[] {
    if (!hasTable(this.database, source.table)) return [];
    const params: string[] = [];
    const textSql = source.textColumns.map((column) => `coalesce(t.${column}, '')`).join(` || ' ' || `);
    const where = terms.map((term) => {
      params.push(`%${term.toLowerCase()}%`);
      return `lower(${textSql}) LIKE ?`;
    }).join(' OR ');
    const caseSelect = linkedCaseExpression(source);
    const caseJoin = linkedCaseJoin(source);
    const caseNumberSelect = caseJoin.includes(' cases c ') ? 'c.case_number' : (source.table === 'cases' ? 't.case_number' : 'NULL');
    const titleSelect = source.titleColumn ? `coalesce(t.${source.titleColumn}, t.${source.idColumn})` : `t.${source.idColumn}`;
    const dateSelect = source.dateColumn ? `t.${source.dateColumn}` : 'NULL';
    const rows = this.database.prepare<DatabaseRow>(`
      SELECT t.*, ${caseSelect} AS __case_id, ${caseNumberSelect} AS __case_number, ${titleSelect} AS __title, ${dateSelect} AS __occurred_at
      FROM ${source.table} t
      ${caseJoin}
      WHERE ${where}
      ORDER BY ${source.dateColumn ? `t.${source.dateColumn}` : `t.${source.idColumn}`} DESC
      LIMIT 40
    `).all(...params);
    return rows.map((row) => this.mapFreeTextRow(source, row, terms, matchKind, knownCaseIds.includes(row.__case_id)));
  }

  private findLinkedCaseFreeTextMatchesInSource(source: FreeTextSource, caseIds: string[], existing: Set<string>): DataSubjectAccessPrefillFreeTextMatch[] {
    if (!hasLinkedCase(source) || !hasTable(this.database, source.table)) return [];
    const caseJoin = linkedCaseJoin(source);
    const caseExpr = linkedCaseExpression(source);
    const caseNumberSelect = caseJoin.includes(' cases c ') ? 'c.case_number' : (source.table === 'cases' ? 't.case_number' : 'NULL');
    const titleSelect = source.titleColumn ? `coalesce(t.${source.titleColumn}, t.${source.idColumn})` : `t.${source.idColumn}`;
    const dateSelect = source.dateColumn ? `t.${source.dateColumn}` : 'NULL';
    const rows = this.database.prepare<DatabaseRow>(`
      SELECT t.*, ${caseExpr} AS __case_id, ${caseNumberSelect} AS __case_number, ${titleSelect} AS __title, ${dateSelect} AS __occurred_at
      FROM ${source.table} t
      ${caseJoin}
      WHERE ${caseExpr} IN (${placeholders(caseIds)})
      ORDER BY ${source.dateColumn ? `t.${source.dateColumn}` : `t.${source.idColumn}`} DESC
      LIMIT 80
    `).all(...caseIds);
    return rows
      .map((row) => this.mapFreeTextRow(source, row, [], 'linked_case', true))
      .filter((row) => !existing.has(row.id));
  }

  private mapFreeTextRow(source: FreeTextSource, row: Record<string, unknown>, terms: string[], matchKind: DataSubjectAccessPrefillFreeTextMatch['matchKind'], linkedKnownCase: boolean): DataSubjectAccessPrefillFreeTextMatch {
    const body = textOf(row, source.textColumns);
    const matched = terms.length ? matchedTermsIn(body, terms) : [];
    const id = `${source.sourceType}:${String(row[source.idColumn] ?? row.__title ?? source.sourceLabel)}`;
    return {
      id,
      sourceType: source.sourceType,
      sourceLabel: source.sourceLabel,
      title: String(row.__title ?? row[source.titleColumn ?? source.idColumn] ?? source.sourceLabel),
      caseId: optional(row.__case_id),
      caseNumber: optional(row.__case_number),
      occurredAt: optional(row.__occurred_at),
      matchedTerms: matched,
      matchKind: matchKind === 'linked_case' || linkedKnownCase && !matched.length ? 'linked_case' : 'name_or_reference',
      excerpt: excerpt(body, matched.length ? matched : terms, 'Fallaktenverknüpfter Freitext ohne Namensnennung im Auszug.'),
      requiresManualReview: true,
    };
  }

  private dedupeFreeTextMatches(matches: DataSubjectAccessPrefillFreeTextMatch[]): DataSubjectAccessPrefillFreeTextMatch[] {
    const byId = new Map<string, DataSubjectAccessPrefillFreeTextMatch>();
    matches.forEach((match) => byId.set(match.id, match));
    return Array.from(byId.values());
  }

  private findDeadlines(protectedPersonIds: string[], legacyPersonIds: string[], caseIds: string[], measureIds: string[]): DataSubjectAccessPrefillDeadline[] {
    if (!hasTable(this.database, 'deadlines')) return [];
    const whereParts: string[] = [];
    const params: string[] = [];
    if (caseIds.length) {
      whereParts.push(`case_id IN (${placeholders(caseIds)})`);
      params.push(...caseIds);
    }
    if (protectedPersonIds.length) {
      whereParts.push(`process_id IN (${placeholders(protectedPersonIds)})`);
      params.push(...protectedPersonIds);
    }
    if (legacyPersonIds.length) {
      whereParts.push(`person_id IN (${placeholders(legacyPersonIds)})`);
      params.push(...legacyPersonIds);
    }
    if (measureIds.length) {
      whereParts.push(`measure_id IN (${placeholders(measureIds)})`);
      params.push(...measureIds);
    }
    if (!whereParts.length) return [];
    return this.database.prepare<DatabaseRow>(`
      SELECT * FROM deadlines
      WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
      ORDER BY due_at ASC
      LIMIT 100
    `).all(...params).map(mapDeadline);
  }

  private findMeasures(caseIds: string[]): DataSubjectAccessPrefillMeasure[] {
    if (!caseIds.length || !hasTable(this.database, 'case_measures')) return [];
    return this.database.prepare<DatabaseRow>(`
      SELECT * FROM case_measures
      WHERE case_id IN (${placeholders(caseIds)})
      ORDER BY opened_at DESC, updated_at DESC
      LIMIT 100
    `).all(...caseIds).map(mapMeasure);
  }

  private findImportRuns(protectedPersonIds: string[]): DataSubjectAccessPrefillImportRun[] {
    if (!protectedPersonIds.length || !hasTable(this.database, 'person_import_run_items') || !hasTable(this.database, 'person_import_runs')) return [];
    return this.database.prepare<DatabaseRow>(`
      SELECT r.id, r.source_file_name, r.imported_at, i.action, i.changed_fields_json
      FROM person_import_run_items i
      JOIN person_import_runs r ON r.id = i.run_id
      WHERE i.protected_person_id IN (${placeholders(protectedPersonIds)})
      ORDER BY r.imported_at DESC, i.row_number ASC
      LIMIT 80
    `).all(...protectedPersonIds).map(mapImport);
  }

  private findLifecycleEvents(protectedPersonIds: string[], legacyPersonIds: string[], caseIds: string[]): DataSubjectAccessPrefillLifecycleEvent[] {
    if (!hasTable(this.database, 'personal_data_audit_log')) return [];
    const whereParts: string[] = [];
    const params: string[] = [];
    const subjectIds = unique([...protectedPersonIds, ...legacyPersonIds]);
    if (subjectIds.length) {
      whereParts.push(`subject_id IN (${placeholders(subjectIds)})`);
      params.push(...subjectIds);
    }
    if (caseIds.length) {
      whereParts.push(`case_id IN (${placeholders(caseIds)})`);
      params.push(...caseIds);
    }
    if (!whereParts.length) return [];
    return this.database.prepare<DatabaseRow>(`
      SELECT id, occurred_at, action, subject_type, subject_id, case_id, purpose
      FROM personal_data_audit_log
      WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
      ORDER BY occurred_at DESC, sequence DESC
      LIMIT 100
    `).all(...params).map(mapLifecycle);
  }
}
