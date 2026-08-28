import type {
  DataSubjectAccessPrefill,
  DataSubjectAccessPrefillFreeTextMatch,
  DataSubjectAccessReviewItem,
  DataSubjectAccessSourceInventoryItem,
} from '../src/domain/models/compliance.model.js';
import { DATA_SUBJECT_ACCESS_SOURCES, sourceInventoryItem } from '../src/domain/compliance/dataSubjectAccessPolicy.js';
import type { DatabaseAdapter } from './databaseService.js';
import { hasTable } from './dsarPrefillSupport.js';

export const FREE_TEXT_SOURCE_TO_INVENTORY: Record<string, string> = {
  case: 'cases',
  case_note: 'cases',
  case_measure_note: 'measures',
  case_document: 'generated_documents',
  case_measure: 'measures',
  participation_measure: 'measures',
  workplace_accommodation: 'measures',
  case_measure_event: 'measures',
  bem_process: 'measures',
  bem_event: 'measures',
  prevention_process: 'measures',
  prevention_event: 'measures',
  equalization_process: 'measures',
  termination_hearing: 'measures',
  sbv_participation: 'measures',
  sbv_participation_event: 'measures',
  participation_violations: 'participation_violations',
  participation_violation_event: 'participation_violations',
  generated_documents: 'generated_documents',
  contacts: 'contacts',
  contact_text_reference: 'contacts',
  activity_journal: 'activity_journal',
  recruiting: 'recruiting',
  recruiting_interview: 'recruiting',
  privacy_reviews: 'privacy_reviews',
  external_references: 'external_references',
  sbv_office: 'sbv_office',
  elections: 'elections',
  case_search_index: 'cases',
};

export function buildDsarSourceInventory(
  database: DatabaseAdapter,
  prefill: Pick<DataSubjectAccessPrefill, 'persons' | 'cases' | 'deadlines' | 'measures' | 'importRuns' | 'lifecycleEvents' | 'freeTextMatches'>,
): DataSubjectAccessSourceInventoryItem[] {
  const counts = new Map<string, number>();
  const add = (id: string, count: number) => counts.set(id, (counts.get(id) ?? 0) + count);
  add('persons', prefill.persons.filter((person) => person.recordKind !== 'legacy_person').length);
  add('legacy_persons', prefill.persons.filter((person) => person.recordKind === 'legacy_person').length);
  add('cases', prefill.cases.length);
  add('deadlines', prefill.deadlines.length);
  add('measures', prefill.measures.length);
  add('imports', prefill.importRuns.length);
  add('lifecycle_audit', prefill.lifecycleEvents.length);
  for (const match of prefill.freeTextMatches) {
    add(FREE_TEXT_SOURCE_TO_INVENTORY[match.sourceType] ?? match.sourceType, 1);
  }

  return DATA_SUBJECT_ACCESS_SOURCES.map((definition) => {
    const foundCount = counts.get(definition.id) ?? 0;
    const status = definition.table && !hasTable(database, definition.table)
      ? 'not_available'
      : foundCount > 0
        ? 'found'
        : 'none';
    return sourceInventoryItem(definition, foundCount, status);
  });
}

export function buildDsarReviewItems(matches: DataSubjectAccessPrefillFreeTextMatch[]): DataSubjectAccessReviewItem[] {
  return matches.slice(0, 120).map((match) => {
    const sourceId = FREE_TEXT_SOURCE_TO_INVENTORY[match.sourceType] ?? match.sourceType;
    const metadataOnly = ['generated_documents', 'privacy_reviews', 'lifecycle_audit', 'external_references'].includes(sourceId);
    return {
      id: `review:${match.id}`,
      sourceId,
      sourceLabel: match.sourceLabel,
      title: match.title,
      caseReference: match.caseNumber ?? match.caseId,
      recommendation: metadataOnly ? 'metadata_only' : 'redact_before_release',
      reason: metadataOnly
        ? 'Diese Quelle wird in der Auskunft regelmäßig als Metadaten-/Prüfhinweis geführt; Inhalte oder Anhänge sind gesondert zu bewerten.'
        : 'Freitext kann Angaben Dritter, vertrauliche SBV-Notizen oder Gesundheitsdaten enthalten und muss vor Weitergabe geprüft bzw. geschwärzt werden.',
      excerpt: match.excerpt,
    };
  });
}
