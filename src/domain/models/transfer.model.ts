export type TransferImportKind = 'case_handover';
export type TransferImportMode = 'create_new' | 'merge_existing';
export type TransferImportConflictLevel = 'safe_match' | 'possible_match' | 'true_conflict';
export type TransferImportDecisionSeverity = 'info' | 'warning' | 'critical';

export interface TransferImportDecisionItem {
  id: string;
  label: string;
  severity: TransferImportDecisionSeverity;
  description: string;
}

export interface TransferImportPlan {
  transferKind: TransferImportKind;
  defaultMode: TransferImportMode;
  mergeAllowed: boolean;
  requiresExplicitDecision: boolean;
  privacyReviewRequired: boolean;
  retentionReviewRequired: boolean;
  safeMatchCount: number;
  possibleMatchCount: number;
  conflictCount: number;
  officeScopeIncluded?: boolean;
  decisions: TransferImportDecisionItem[];
}
