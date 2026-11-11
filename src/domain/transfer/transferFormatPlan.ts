import type { TransferCapabilities } from '../models/transfer-capability.model.js';

export interface VacationHandoverFormatPlan {
  suggested: 2 | 4 | null;
  available: Array<2 | 4>;
  verified: boolean;
}

const WRITABLE_VACATION_FORMATS = [4, 2] as const;

export function planVacationHandoverFormat(capabilities: TransferCapabilities | null): VacationHandoverFormatPlan {
  if (!capabilities) return { suggested: 4, available: [...WRITABLE_VACATION_FORMATS], verified: false };
  const available = WRITABLE_VACATION_FORMATS.filter((format) => capabilities.readFormats.includes(format));
  return { suggested: available[0] ?? null, available, verified: true };
}
