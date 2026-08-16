export interface AssemblyAnnualStateLike {
  year: number;
  scheduledAt?: string;
  status: string;
}

export function canMarkAssemblyReady(input: { scheduledAt?: string; invitationAt?: string }): boolean {
  return Boolean(input.scheduledAt && input.invitationAt);
}

export function shouldWarnAboutAnnualAssembly(records: AssemblyAnnualStateLike[], year: number, now: Date): boolean {
  if (now.getFullYear() !== year || now.getMonth() < 9) return false;
  return !records.some((record) => record.year === year && (record.status === 'held' || record.status === 'closed' || Boolean(record.scheduledAt)));
}
