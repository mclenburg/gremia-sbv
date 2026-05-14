import type { CaseSearchSourceType, ConfidentialLevel } from '../../src/app/core/models/case-note.model.js';
import type { DatabaseAdapter } from '../databaseService.js';

export type { CaseSearchSourceType } from '../../src/app/core/models/case-note.model.js';

export type CaseSearchNavigationKind =
  | 'case'
  | 'note'
  | 'document'
  | 'measure'
  | 'process';

export type CaseSearchExtractionQuality =
  | 'structured'
  | 'native_text'
  | 'ocr'
  | 'manual'
  | 'unknown';

export interface CaseSearchNavigationTarget {
  kind: CaseSearchNavigationKind;
  id: string;
  subId?: string;
}

export interface CaseSearchDocument {
  caseId: string;
  caseNumber?: string;
  sourceType: CaseSearchSourceType;
  sourceId: string;
  sourceLabel: string;
  title: string;
  content: string;
  keywords?: string;
  occurredAt?: string;
  updatedAt: string;
  confidentiality: ConfidentialLevel;
  containsHealthData: boolean;
  extractionQuality: CaseSearchExtractionQuality;
  navigationTarget: CaseSearchNavigationTarget;
}

export interface CaseSearchProvider {
  readonly sourceType: CaseSearchSourceType;
  readonly label: string;
  readonly requiredTables: readonly string[];
  collectForCase(db: DatabaseAdapter, caseId: string): CaseSearchDocument[];
  collectAll(db: DatabaseAdapter): CaseSearchDocument[];
  latestUpdatedAtForCase(db: DatabaseAdapter, caseId: string): string | undefined;
  latestUpdatedAtAll(db: DatabaseAdapter): string | undefined;
}

