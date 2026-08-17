import type { CaseDocumentRecord } from '../../../domain/models/case-document.model';
import type { CaseNoteRecord, CaseSearchResult, CaseSearchSourceType } from '../../../domain/models/case-note.model';
import type { FormEvent } from 'react';
import type { PreventionProcessRecord } from '../../../domain/models/prevention.model';
import type { BemProcessRecord } from '../../../domain/models/bem.model';
import type { EqualizationProcessRecord } from '../../../domain/models/equalization.model';
import type { TerminationHearingRecord } from '../../../domain/models/termination.model';
import type { ParticipationRecord } from '../../../domain/models/participation.model';
import type { WorkplaceAccommodationRecord } from '../../../domain/models/workplace-accommodation.model';
import type { CaseRecord } from '../../../domain/models/case.model';

export type CaseProcessType = 'prevention' | 'bem' | 'termination_hearing' | 'equalization' | 'participation' | 'workplace_accommodation';

export type CaseExplorerSelection =
  | { type: 'overview' }
  | { type: 'note'; id: string }
  | { type: 'document'; id: string }
  | { type: 'process'; processType: CaseProcessType; id?: string }
  | { type: 'search'; id: string };

export type CaseTreePanelProps = {
  selectedCase?: CaseRecord;
  notes: CaseNoteRecord[];
  documents: CaseDocumentRecord[];
  preventionProcesses: PreventionProcessRecord[];
  bemProcesses: BemProcessRecord[];
  equalizationProcesses: EqualizationProcessRecord[];
  terminationProcesses: TerminationHearingRecord[];
  participationProcesses: ParticipationRecord[];
  workplaceAccommodationProcesses: WorkplaceAccommodationRecord[];
  isLoading?: boolean;
  selection: CaseExplorerSelection;
  onSelect: (selection: CaseExplorerSelection) => void;
  onDeleteProcess?: (target: { id: string; processType: CaseProcessType; label?: string }) => void;
  formatProcessNodeSubtitle: (processType: CaseProcessType, status?: string) => string;
  formatNoteDate: (value: string) => string;
  formatBytes: (value?: number) => string;
};

export type CaseDetailPanelSearchProps = {
  searchQuery: string;
  searchOnlySelectedCase: boolean;
  searchResults: CaseSearchResult[];
  searchError: string;
  searchInfo: string;
  isSearching: boolean;
  selectedSearchSourceTypes: CaseSearchSourceType[];
  onSearchSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onSearchQueryChange: (value: string) => void;
  onSearchOnlySelectedCaseChange: (value: boolean) => void;
  onSearchSourceTypesChange: (value: CaseSearchSourceType[]) => void;
  onSelectSearchResult: (result: CaseSearchResult) => void;
};
