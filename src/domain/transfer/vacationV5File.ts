import type { VacationV5ScopeSelection } from './vacationV5ScopePolicy';

export type VacationV5ScopeKey = Exclude<keyof VacationV5ScopeSelection, 'inclusionOfficerSnapshotId'>
  | 'inclusionOfficerSnapshotId';

export interface VacationV5ScopeCandidate {
  id: string;
  scopeKey: VacationV5ScopeKey;
  label: string;
  detail: string;
  dueAt?: string;
  recommended: boolean;
  requiredParent?: { scopeKey: VacationV5ScopeKey; id: string };
  documents: Array<{ id: string; filename: string; sizeBytes: number; containsHealthData: boolean }>;
}

export interface VacationV5ExportPreview {
  digest: string;
  sectionCounts: Array<{ type: string; count: number }>;
  documents: Array<{ filename: string; owner: string; sizeBytes: number; containsHealthData: boolean }>;
  documentBytes: number;
  sensitiveTextCount: number;
}

export interface VacationV5SelectionRequest {
  selection: VacationV5ScopeSelection;
  measureIds?: readonly string[];
  documentIds?: readonly string[];
  officeDocumentIds?: readonly string[];
  handoverNote?: string;
}

export interface VacationV5ExportRequest extends VacationV5SelectionRequest {
  profileId: string;
  expiresAt: string;
  passphrase: string;
  previewDigest: string;
}

export type VacationV5ExportResult = { exported: false } | {
  exported: true;
  filePath: string;
  packageId: string;
  targetInstanceId: string;
  sectionCounts: Array<{ type: string; count: number }>;
};

export interface VacationV5PackageReview {
  packageId: string;
  expiresAt: string;
  senderInstanceId: string;
  sectionCounts: Array<{ type: string; count: number }>;
  documentCount: number;
  documentBytes: number;
  documents: Array<{ filename: string; owner: string; sizeBytes: number }>;
  handoverNote?: string;
}

export interface VacationV5ReturnExportRequest {
  sourcePackageId: string;
  profileId: string;
  expiresAt: string;
  passphrase: string;
  cancellationRequests?: Array<{ ref: string; reason: string }>;
  additionalItems?: Array<{ kind: string; localId: string }>;
  previewDigest: string;
}

export interface VacationV5ReturnSelection {
  sourcePackageId: string;
  cancellationRequests?: Array<{ ref: string; reason: string }>;
  additionalItems?: Array<{ kind: string; localId: string }>;
}

export interface VacationV5ReturnPackageOption {
  sourcePackageId: string;
  validUntil: string | null;
  importedAt: string;
  itemCount: number;
}

export interface VacationV5ReturnInventory {
  sourcePackageId: string;
  profileId: string | null;
  profileLabel: string | null;
  items: Array<{ ref: string; kind: string; localId: string; label: string;
    status: 'unchanged' | 'changed' | 'missing' }>;
  additions: Array<{ key: string; label: string; items: Array<{ kind: string; localId: string }> }>;
}

export interface VacationV5ReturnAdditionCandidate {
  key: string;
  label: string;
  items: Array<{ kind: string; localId: string }>;
}

export interface VacationV5ReturnExportPreview {
  digest: string;
  changes: Array<{ ref: string; kind: string; operation: 'upsert' | 'cancel_request'; label: string }>;
  documentBytes: number;
}

export type VacationV5ReturnExportResult = { exported: false } | {
  exported: true;
  filePath: string;
  packageId: string;
  changeCount: number;
  targetInstanceId: string;
};
