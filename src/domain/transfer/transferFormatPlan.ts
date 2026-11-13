import type { TransferCapabilities } from '../models/transfer-capability.model.js';

export interface VacationHandoverFormatPlan {
  suggested: 2 | 4 | 5 | null;
  available: Array<2 | 4 | 5>;
  verified: boolean;
}

const WRITABLE_VACATION_FORMATS = [4, 2] as const;

export function planVacationHandoverFormat(capabilities: TransferCapabilities | null): VacationHandoverFormatPlan {
  if (!capabilities) return { suggested: 2, available: [2, 4], verified: false };
  const available: Array<2 | 4 | 5> = [
    ...(capabilities.readFormats.includes(5) && capabilities.features.includes('vacation_scope_v5') ? [5 as const] : []),
    ...WRITABLE_VACATION_FORMATS.filter((format) => capabilities.readFormats.includes(format)),
  ];
  return { suggested: available[0] ?? null, available, verified: true };
}
