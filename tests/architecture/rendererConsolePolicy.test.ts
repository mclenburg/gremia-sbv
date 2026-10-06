import { describe, expect, it } from 'vitest';
import {
  buildRendererConsoleDiagnostic,
  emitRendererConsoleDiagnostic,
  registerRendererConsoleDiagnostics,
  shouldForwardRendererConsoleDiagnostics,
} from '../../electron/rendererConsoleDiagnostics';

describe('Renderer-Diagnostik', () => {
  it('leitet Renderer-Konsolenmeldungen nicht standardmäßig und niemals mit Rohinhalt weiter', () => {
    expect(shouldForwardRendererConsoleDiagnostics(false, undefined)).toBe(false);
    expect(shouldForwardRendererConsoleDiagnostics(true, '1')).toBe(false);
    expect(shouldForwardRendererConsoleDiagnostics(false, '1')).toBe(true);

    const diagnostic = buildRendererConsoleDiagnostic(2, 'Name: Erika Muster, GdB 80', 42);
    expect(diagnostic.prefix).toBe('Gremia.SBV renderer console error');
    expect(diagnostic.metadata).toEqual({ level: 2, line: 42, messageLength: 26 });
    expect(JSON.stringify(diagnostic)).not.toContain('Erika');
    expect(JSON.stringify(diagnostic)).not.toContain('GdB');
  });

  it('kapselt die Ausgabe ohne Rohinhalt und ohne direkten console.log-Pfad', () => {
    const calls: Array<{ method: string; prefix: string; metadata: unknown }> = [];
    const sink = {
      error: (prefix: string, metadata: unknown) => calls.push({ method: 'error', prefix, metadata }),
      info: (prefix: string, metadata: unknown) => calls.push({ method: 'info', prefix, metadata }),
      warn: (prefix: string, metadata: unknown) => calls.push({ method: 'warn', prefix, metadata }),
    };

    emitRendererConsoleDiagnostic(sink, 2, 'Name: Erika Muster, GdB 80', 42);

    expect(calls).toEqual([{
      method: 'error',
      prefix: 'Gremia.SBV renderer console error',
      metadata: { level: 2, line: 42, messageLength: 26 },
    }]);
    expect(JSON.stringify(calls)).not.toContain('Erika');
  });

  it('registriert nur im freigegebenen Entwicklungsmodus und leitet ohne Rohmeldung weiter', () => {
    const calls: unknown[][] = [];
    const sink = {
      error: (...args: unknown[]) => calls.push(args),
      info: (...args: unknown[]) => calls.push(args),
      warn: (...args: unknown[]) => calls.push(args),
    };
    const listeners: Array<(level: number, message: string, line: number) => void> = [];
    const register = (listener: (level: number, message: string, line: number) => void) => listeners.push(listener);

    registerRendererConsoleDiagnostics(register, sink, true, '1');
    registerRendererConsoleDiagnostics(register, sink, false, undefined);
    expect(listeners).toHaveLength(0);

    registerRendererConsoleDiagnostics(register, sink, false, '1');
    expect(listeners).toHaveLength(1);
    listeners[0](2, 'Name: Erika Muster, GdB 80', 42);
    expect(calls).toEqual([['Gremia.SBV renderer console error', { level: 2, line: 42, messageLength: 26 }]]);
    expect(JSON.stringify(calls)).not.toContain('Erika');
    expect(JSON.stringify(calls)).not.toContain('GdB');
  });
});
