import type { CaseDocumentRecord } from '../../core/models/case-document.model';
import type { CaseNoteRecord, CaseSearchResult } from '../../core/models/case-note.model';
import type { FormEvent } from 'react';
import type { PreventionProcessRecord } from '../../core/models/prevention.model';
import type { BemProcessRecord } from '../../core/models/bem.model';
import type { EqualizationProcessRecord } from '../../core/models/equalization.model';
import type { CaseRecord } from '../../core/models/case.model';

export type CaseProcessType = 'prevention' | 'bem' | 'termination_hearing' | 'equalization';

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
  selection: CaseExplorerSelection;
  onSelect: (selection: CaseExplorerSelection) => void;
  formatProcessNodeSubtitle: (processType: CaseProcessType, status?: string) => string;
  formatNoteDate: (value: string) => string;
  formatBytes: (value?: number) => string;
};

export type CaseDetailPanelSearchProps = {
  searchQuery: string;
  searchOnlySelectedCase: boolean;
  searchResults: CaseSearchResult[];
  onSearchSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onSearchQueryChange: (value: string) => void;
  onSearchOnlySelectedCaseChange: (value: boolean) => void;
  onSelectSearchResult: (result: CaseSearchResult) => void;
};
