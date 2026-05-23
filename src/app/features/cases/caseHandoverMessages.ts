import type { CaseHandoverExportResult } from '../../core/models/case-handover.model';

export function formatCaseHandoverExportResultMessage(result: CaseHandoverExportResult): string {
  if (!result.exported) return 'Export wurde abgebrochen.';
  const summary = `Übergabepaket erstellt: ${result.caseCount} Fallakte(n), ${result.measureCount} Maßnahme(n), ${result.documentCount} Dokument(e).`;
  const fileLocation = result.filePath?.trim();
  return fileLocation ? `${summary} Speicherort: ${fileLocation}` : summary;
}
