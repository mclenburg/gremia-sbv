export type RendererDiagnosticLevel = 'warning' | 'error';

export interface RendererDiagnostic {
  level: RendererDiagnosticLevel;
  message: string;
  errorName?: string;
}

function errorName(error: unknown): string | undefined {
  return error instanceof Error ? error.name : undefined;
}

export function recordRendererDiagnostic(level: RendererDiagnosticLevel, message: string, error?: unknown): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<RendererDiagnostic>('gremia-sbv:renderer-diagnostic', {
    detail: { level, message, errorName: errorName(error) },
  }));
}
