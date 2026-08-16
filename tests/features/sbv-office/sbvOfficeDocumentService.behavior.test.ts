import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { SbvOfficeDocumentService } from '../../../services/sbvOfficeDocumentService';

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
    const adapter = { store: async (input: unknown) => { calls.push(input); return { id: 'd-1', filename: 'x.txt', sha256: 'a'.repeat(64) }; } };
    const service = new SbvOfficeDocumentService(new AssemblyDb(), adapter as never);
    const result = await service.generateAssemblyDocument('a-1', 'agenda');
    expect(result.id).toBe('d-1');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ owner: { type: 'assembly', id: 'a-1' }, documentClass: 'generated_document' });
  });
});
