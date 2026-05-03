import { useEffect, useMemo, useState } from 'react';
import type { GenerateReportInput, ReportDescriptor, ReportExportHistoryItem, ReportGenerationResult, ReportType } from '../../core/models/report.model';
import { defaultReportPeriod, generateReportDocument, loadReportMetadata } from './reportService';

export function useReports() {
  const defaultPeriod = useMemo(() => defaultReportPeriod(), []);
  const [descriptors, setDescriptors] = useState<ReportDescriptor[]>([]);
  const [history, setHistory] = useState<ReportExportHistoryItem[]>([]);
  const [periodStart, setPeriodStart] = useState(defaultPeriod.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.periodEnd);
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [result, setResult] = useState<ReportGenerationResult | null>(null);
  const [error, setError] = useState('');

  async function loadReportsMeta() {
    const next = await loadReportMetadata();
    setDescriptors(next.descriptors);
    setHistory(next.history);
  }

  useEffect(() => {
    loadReportsMeta().catch((error) => {
      console.error('Gremia.SBV report metadata failed', error);
      setError(error instanceof Error ? error.message : 'Berichtsmodul konnte nicht geladen werden.');
    });
  }, []);

  async function generateReport(type: ReportType) {
    setGenerating(type);
    setError('');
    setResult(null);
    try {
      const input: GenerateReportInput = {
        type,
        periodStart: periodStart ? new Date(periodStart).toISOString() : undefined,
        periodEnd: periodEnd ? new Date(periodEnd).toISOString() : undefined
      };
      const generated = await generateReportDocument(input);
      if (!generated.ok) throw new Error(generated.error ?? 'Bericht konnte nicht erzeugt werden.');
      setResult(generated);
      await loadReportsMeta();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bericht konnte nicht erzeugt werden.');
    } finally {
      setGenerating(null);
    }
  }

  return {
    descriptors,
    history,
    periodStart,
    periodEnd,
    generating,
    result,
    error,
    setPeriodStart,
    setPeriodEnd,
    generateReport
  };
}
