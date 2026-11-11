import type { VacationV5PlannedReturnItem } from './vacationV5ReturnPlan';

export interface VacationV5ReturnChoice {
  ref: string;
  action: 'accept_update' | 'accept_conflict_update' | 'accept_addition' | 'keep_origin' | 'acknowledge_cancellation';
  expectedOriginSha256: string | null;
}

export interface VacationV5ReturnImportInput {
  filePath: string;
  passphrase: string;
  choices: VacationV5ReturnChoice[];
}

export interface VacationV5ReturnImportResult {
  importId: string;
  acceptedCount: number;
  reviewedCount: number;
}

export interface VacationV5ReturnReviewItem extends VacationV5PlannedReturnItem {
  expectedOriginSha256: string | null;
  originData: Record<string, string | number | boolean | null> | null;
  deputyData: Record<string, string | number | boolean | null> | null;
  cancellationReason?: string;
}

export interface VacationV5ReturnReview {
  packageId: string;
  sourcePackageId: string;
  expiresAt: string;
  senderInstanceId: string;
  items: VacationV5ReturnReviewItem[];
}
