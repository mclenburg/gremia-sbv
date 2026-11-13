export type CaseHandoverEntry = { tab: 'vacation' | 'import'; caseId?: string };

let pendingEntry: CaseHandoverEntry | null = null;

export function requestCaseHandoverEntry(entry: CaseHandoverEntry): void {
  pendingEntry = entry;
}

export function peekCaseHandoverEntry(): CaseHandoverEntry | null {
  return pendingEntry;
}

export function consumeCaseHandoverEntry(): CaseHandoverEntry | null {
  const entry = pendingEntry;
  pendingEntry = null;
  return entry;
}
