import type { CaseCategory, CaseRecord } from '../../core/models/case.model';
import type { PrivacyReviewActionInput, PrivacyReviewActionResult, PrivacyReviewItemRecord } from '../../core/models/privacy-review.model';
import type { CreateProtectedPersonInput, PersonImportExecuteInput, PersonImportExecuteResult, PersonImportPreviewInput, PersonImportPreviewResult, PersonStatusExpirySummary, ProtectedPersonRecord, UpdateProtectedPersonInput } from '../../core/models/protected-person.model';
import type { ImportSource } from './personImportUi';

export type CreateCaseForPersonInput = { caseNumber: string; displayName: string; category: CaseCategory; summary?: string };
export type ReviewCaseActionInput = Required<Pick<PrivacyReviewActionInput, 'caseId' | 'reason' | 'confirmation'>>;

export type PersonsViewProps = {
  persons: ProtectedPersonRecord[];
  cases: CaseRecord[];
  onCreateCaseForPerson: (person: ProtectedPersonRecord, input: CreateCaseForPersonInput) => Promise<void>;
  onCreate: (input: CreateProtectedPersonInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateProtectedPersonInput) => Promise<void>;
  onSelectImportFile: () => Promise<ImportSource | null>;
  onPreviewImport: (input: PersonImportPreviewInput) => Promise<PersonImportPreviewResult>;
  onExecuteImport: (input: PersonImportExecuteInput) => Promise<PersonImportExecuteResult>;
  onEvaluateExpiry: () => Promise<PersonStatusExpirySummary>;
  onExportIcal: () => Promise<void>;
  onListOpenPrivacyReviews: (personId: string) => Promise<PrivacyReviewItemRecord[]>;
  onDocumentRetention: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onScheduleReviewLater: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onClearReview: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onAnonymizeReviewCase: (input: ReviewCaseActionInput) => Promise<PrivacyReviewActionResult>;
  onDeleteReviewCase: (input: ReviewCaseActionInput) => Promise<PrivacyReviewActionResult>;
  onAnonymizePerson: (personId: string, reason: string) => Promise<void>;
  onDeletePerson: (personId: string, reason: string) => Promise<void>;
};
