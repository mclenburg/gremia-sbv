import type { CaseSearchProvider, CaseSearchSourceType } from './searchTypes.js';
import { caseMetadataSearchProvider, caseNotesSearchProvider, caseDocumentsSearchProvider, documentOcrSearchProvider, caseMeasureNotesSearchProvider } from './searchProvidersDocuments.js';
import { bemSearchProvider, bemEventSearchProvider, preventionSearchProvider, preventionEventSearchProvider, terminationSearchProvider, equalizationSearchProvider, participationSearchProvider, participationEventSearchProvider, measureSearchProvider, measureEventSearchProvider, workplaceAccommodationSearchProvider } from './searchProvidersProcesses.js';
export * from './searchProvidersDocuments.js';
export * from './searchProvidersProcesses.js';

export const CASE_SEARCH_PROVIDERS = [
  caseMetadataSearchProvider,
  caseNotesSearchProvider,
  caseDocumentsSearchProvider,
  documentOcrSearchProvider,
  caseMeasureNotesSearchProvider,
  bemSearchProvider,
  bemEventSearchProvider,
  preventionSearchProvider,
  preventionEventSearchProvider,
  terminationSearchProvider,
  equalizationSearchProvider,
  participationSearchProvider,
  participationEventSearchProvider,
  measureSearchProvider,
  measureEventSearchProvider,
  workplaceAccommodationSearchProvider,
] as const satisfies readonly CaseSearchProvider[];

export function caseSearchSourceLabels(): Record<CaseSearchSourceType, string> {
  return CASE_SEARCH_PROVIDERS.reduce((labels, provider) => {
    labels[provider.sourceType] = provider.label;
    return labels;
  }, {} as Record<CaseSearchSourceType, string>);
}
