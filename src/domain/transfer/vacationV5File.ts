import type { VacationV5ScopeSelection } from './vacationV5ScopePolicy';

export interface VacationV5ExportRequest {
  selection: VacationV5ScopeSelection;
  measureIds?: string[];
  documentIds?: string[];
  officeDocumentIds?: string[];
  profileId: string;
  expiresAt: string;
  passphrase: string;
}

export type VacationV5ExportResult = { exported: false } | {
  exported: true;
  filePath: string;
  packageId: string;
  targetInstanceId: string;
  sectionCounts: Array<{ type: string; count: number }>;
};

export interface VacationV5ReturnExportRequest {
  sourcePackageId: string;
  profileId: string;
  expiresAt: string;
  passphrase: string;
  cancellationRequests?: Array<{ ref: string; reason: string }>;
  additionalItems?: Array<{ kind: string; localId: string }>;
}

export type VacationV5ReturnExportResult = { exported: false } | {
  exported: true;
  filePath: string;
  packageId: string;
  changeCount: number;
  targetInstanceId: string;
};
