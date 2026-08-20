import { describe, expect, it, vi } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { SbvOfficeDocumentService } from '../../../services/sbvOfficeDocumentService';
import { inspectPdf } from '../../helpers/pdf';

class AssemblyDb implements DatabaseAdapter {
  prepare<T = unknown>(_sql: string) {
    return {
      all: (..._params: unknown[]) => [] as T[],
      get: (..._params: unknown[]): T | undefined => ({ id: 'a-1', year: 2026, scheduled_at: '2026-10-10T10:00:00.000Z', location_or_mode: 'Hybrid', agenda: 'TOP 1', minutes: 'Maßnahme 1' }) as T,
      run: (..._params: unknown[]) => ({}),
    };
  }
  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}
}

describe('SbvOfficeDocumentService', () => {
  it('hands generated assembly documents to the encrypted office-document adapter with the assembly owner', async () => {
    const calls: unknown[] = [];
    const adapter = { store: async (input: unknown) => { calls.push(input); return { id: 'd-1', filename: 'x.pdf', sha256: 'a'.repeat(64) }; } };
    const service = new SbvOfficeDocumentService(new AssemblyDb(), adapter as never);
    const result = await service.generateAssemblyDocument('a-1', 'agenda');
    expect(result.id).toBe('d-1');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ owner: { type: 'assembly', id: 'a-1' }, documentClass: 'generated_document', mimeType: 'application/pdf' });
    const stored = calls[0] as { plain: Buffer };
    const inspected = await inspectPdf(stored.plain);
    expect(inspected.textByPage.join(' ')).toContain('TOP 1');
    expect(inspected.hasStructureTree).toBe(true);
  });

  it('uses the existing audit-chain activity report for the assembly activity-report action', async () => {
    const calls: unknown[] = [];
    const adapter = { store: async (input: unknown) => { calls.push(input); return { id: 'd-2', filename: 'report.pdf', sha256: 'b'.repeat(64) }; } };
    const build = vi.fn((input: unknown) => ({
      title: 'Tätigkeitsbericht der SBV', warnings: [], metrics: {},
      document: { title: 'Tätigkeitsbericht der SBV', blocks: [{ type: 'paragraph' as const, text: 'Nur aus der verifizierten Audit-Chain.' }] },
      input,
    }));
    const reports = { build };
    const service = new SbvOfficeDocumentService(new AssemblyDb(), adapter as never, reports);
    await service.generateAssemblyDocument('a-1', 'activity_report_draft');
    expect(build).toHaveBeenCalledWith({ type: 'activity', periodStart: '2026-01-01', periodEnd: '2026-12-31' });
    const stored = calls[0] as { plain: Buffer };
    expect((await inspectPdf(stored.plain)).textByPage.join(' ')).toContain('Nur aus der verifizierten Audit-Chain.');
  });
});
