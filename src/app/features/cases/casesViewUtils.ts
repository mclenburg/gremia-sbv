export function clampCaseRegisterPage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1));
}

export function caseRegisterSliceBounds(page: number, pageSize: number): { start: number; end: number } {
  const normalizedPage = Math.max(page, 1);
  const normalizedPageSize = Math.max(pageSize, 1);
  const start = (normalizedPage - 1) * normalizedPageSize;
  return { start, end: start + normalizedPageSize };
}
