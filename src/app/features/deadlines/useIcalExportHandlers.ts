import { useCallback, useMemo } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import type { DeadlineListFilters } from '../../core/models/deadline.model';

export type IcalExportPrivacyLevel = 'privacy_first' | 'process_type' | 'case_reference' | 'details';

export interface IcalExportRequest {
  privacyLevel?: IcalExportPrivacyLevel;
  filters?: DeadlineListFilters;
  fileName?: string;
}

function downloadIcsFile(ics: string, fileName: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function useIcalExportHandlers() {
  const exportIcal = useCallback(async (request: IcalExportRequest = {}) => {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines?.exportIcal) throw new Error('iCal-Export ist nicht erreichbar.');
    const ics = await bridge.deadlines.exportIcal(
      request.filters ?? { status: ['open', 'overdue'] },
      request.privacyLevel ?? 'process_type'
    );
    downloadIcsFile(ics, request.fileName ?? 'gremia-sbv-fristen.ics');
  }, []);

  return useMemo(() => ({ exportIcal }), [exportIcal]);
}
