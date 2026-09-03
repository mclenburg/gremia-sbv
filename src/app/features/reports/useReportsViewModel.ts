import { useCallback, useEffect, useState } from 'react';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
  ReportType,
} from '../../../domain/models/report.model';
import {
  buildReportPdfExportFeedback,
  defaultReportDateRange,
  groupReportDescriptorsByPriority,
  isReportGenerationActionDisabled,
  sortReportDescriptorsByPriority,
} from './reportService';

export function useReportsViewModel() {
  const defaultDateRange = defaultReportDateRange();
  const [descriptors, setDescriptors] = useState<ReportDescriptor[]>([]);
  const [history, setHistory] = useState<ReportExportHistoryItem[]>([]);
  const [selectedType, setSelectedType] = useState<ReportType>('activity');
  const [periodStart, setPeriodStart] = useState(defaultDateRange.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultDateRange.periodEnd);
  const [lastResult, setLastResult] = useState<ReportGenerationResult | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [openingFileName, setOpeningFileName] = useState<string | null>(null);
  const announce = useAnnouncer();

  const selectedDescriptor = descriptors.find((descriptor) => descriptor.type === selectedType) ?? descriptors[0];
  const groupedDescriptors = groupReportDescriptorsByPriority(descriptors);
  const generationDisabled = isReportGenerationActionDisabled({
    isGenerating: loading,
    hasSelectedDescriptor: Boolean(selectedDescriptor),
  });

  const loadReports = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
    const [nextDescriptors, nextHistory] = await Promise.all([
      bridge.reports.descriptors(),
      bridge.reports.history(25),
    ]);
    const sorted = sortReportDescriptorsByPriority(nextDescriptors);
    setDescriptors(sorted);
    setHistory(nextHistory);
    if (sorted.length && !sorted.some((descriptor) => descriptor.type === selectedType)) {
      setSelectedType(sorted[0].type);
    }
  }, [selectedType]);

  async function openReport(fileName: string, title = 'Bericht', generatedInCurrentFlow = false) {
    setOpeningFileName(fileName);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
      const result = await bridge.reports.openExportFolder(fileName);
      if (generatedInCurrentFlow) {
        const feedback = buildReportPdfExportFeedback({ title, fileName, openRequested: true, openResult: result });
        setMessage(feedback.message);
        announce(feedback.message, feedback.announceMode);
        return;
      }
      if (!result.opened) throw new Error(result.error ?? 'Bericht wurde bereitgestellt, konnte aber nicht an die externe Vorschau übergeben werden.');
      const info = `${title} wurde an die externe Vorschau übergeben: ${fileName}`;
      setMessage(info);
      announce(info, 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Bericht konnte nicht geöffnet werden.';
      setMessage(info);
      announce(info, 'assertive');
    } finally {
      setOpeningFileName((current) => current === fileName ? null : current);
    }
  }

  async function generateReport(openAfterCreate = false) {
    if (!selectedDescriptor) return;
    setLoading(true);
    setMessage('');
    setLastResult(null);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
      const input: GenerateReportInput = { type: selectedDescriptor.type, periodStart: periodStart || undefined, periodEnd: periodEnd || undefined };
      const result: ReportGenerationResult = await bridge.reports.generate(input);
      setLastResult(result);
      if (!result.ok) throw new Error(result.error || 'Bericht konnte nicht erzeugt werden.');
      await loadReports();
      if (openAfterCreate) {
        const info = `${result.title} wurde als verschlüsselter PDF-Report erzeugt; die externe Vorschau wird angefordert: ${result.fileName}`;
        setMessage(info);
        announce(info, 'polite');
        void openReport(result.fileName, result.title, true);
        return;
      }
      const feedback = buildReportPdfExportFeedback({ title: result.title, fileName: result.fileName, openRequested: false });
      setMessage(feedback.message);
      announce(feedback.message, feedback.announceMode);
    } catch (error) {
      const info = error instanceof Error ? error.message : 'Bericht konnte nicht erzeugt werden.';
      setMessage(info);
      announce(info, 'assertive');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return {
    generationDisabled,
    groupedDescriptors,
    history,
    lastResult,
    loading,
    message,
    openingFileName,
    openReport,
    periodEnd,
    periodStart,
    selectedDescriptor,
    selectedType,
    generateReport,
    loadReports,
    setPeriodEnd,
    setPeriodStart,
    setSelectedType,
  };
}
