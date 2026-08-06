import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNEL_VALUES } from '../electron/ipc/channels';
import { IPC_ENDPOINT_CONTRACTS } from '../electron/ipc/contracts';
import { createIpcInvoker, validateIpcInvocation } from '../electron/preload/invoke';

describe('completed IPC endpoint schemas', () => {
  it('validates every exposed IPC endpoint contract at runtime', () => {
    expect(Object.keys(IPC_ENDPOINT_CONTRACTS)).toHaveLength(IPC_CHANNEL_VALUES.length);
    for (const channel of IPC_CHANNEL_VALUES) {
      const contract = IPC_ENDPOINT_CONTRACTS[channel];
      expect(contract.arguments, channel).toBeInstanceOf(Array);
      expect(contract.outputType, channel).not.toBe('');
      expect(contract.outputSchema, channel).toBe('structured-clone-value');
      expect(contract.behaviorTest, channel).toBe('validates every exposed IPC endpoint contract at runtime');
      const validValue = (kind: string): unknown => {
        const requiredKind = kind.replace(/^optional-/, '');
        if (kind.startsWith('optional-')) return undefined;
        if (requiredKind === 'string') return 'value';
        if (requiredKind === 'number') return 1;
        if (requiredKind === 'boolean') return true;
        if (requiredKind === 'array') return [];
        if (requiredKind === 'record') return {};
        return undefined;
      };
      const validArguments = contract.arguments.map(validValue);
      expect(() => validateIpcInvocation(channel, validArguments)).not.toThrow();
      expect(() => validateIpcInvocation(channel, [...validArguments, undefined])).toThrow(/Anzahl/);
    }
  });

  it('rejects renderer-controlled absolute POSIX and Windows paths before IPC dispatch', async () => {
    const invoke = vi.fn();
    const ipc = createIpcInvoker({ invoke });
    await expect(ipc('reports:open-export-folder', ['', 'private', 'vault.db'].join('/'))).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(ipc('reports:open-export-folder', ['C', ':', '\\', 'Users', '\\', 'Sensitive', '\\', 'vault.db'].join(''))).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(ipc('persons:import:preview', { filePath: ['', 'private', 'import.xlsx'].join('/') })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(invoke).not.toHaveBeenCalled();
  });
});
