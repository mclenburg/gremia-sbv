import { describe, expect, it } from 'vitest';
import { formatCaseHandoverExportResultMessage } from '../src/app/features/cases/caseHandoverMessages';
import { modules } from '../src/app/core/navigation/modules';

describe('case handover export feedback 0.9.2', () => {
  it('meldet den Speicherort des erzeugten Übergabepakets zurück', () => {
    const message = formatCaseHandoverExportResultMessage({
      exported: true,
      filePath: '/safe/export/falluebergabe.gsbvtransfer',
      packageId: 'handover_123',
      caseCount: 1,
      measureCount: 2,
      documentCount: 3,
      deadlineCount: 4,
    });

    expect(message).toContain('/safe/export/falluebergabe.gsbvtransfer');
    expect(message).toContain('1 Fallakte');
    expect(message).toContain('2 Maßnahme');
    expect(message).toContain('3 Dokument');
  });

  it('hält den ehemaligen USB-Platzhalter aus der Navigation heraus', () => {
    const moduleIds = modules.map((module) => module.id);

    expect(moduleIds).not.toContain('portable');
  });
});
