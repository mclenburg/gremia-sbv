export function shouldForwardRendererConsoleDiagnostics(
  isPackaged: boolean,
  enabled: string | undefined,
): boolean {
  return !isPackaged && enabled === "1";
}

export function buildRendererConsoleDiagnostic(level: number, message: string, line: number): {
  prefix: string;
  metadata: { level: number; line: number; messageLength: number };
} {
  return {
    prefix: level >= 2 ? "Gremia.SBV renderer console error" : "Gremia.SBV renderer console",
    metadata: {
      level,
      line,
      messageLength: message.length,
    },
  };
}

export type RendererConsoleDiagnosticSink = Pick<Console, "error" | "info" | "warn">;

export function emitRendererConsoleDiagnostic(
  sink: RendererConsoleDiagnosticSink,
  level: number,
  message: string,
  line: number,
): void {
  const diagnostic = buildRendererConsoleDiagnostic(level, message, line);
  if (level >= 2) {
    sink.error(diagnostic.prefix, diagnostic.metadata);
    return;
  }
  if (level === 1) {
    sink.warn(diagnostic.prefix, diagnostic.metadata);
    return;
  }
  sink.info(diagnostic.prefix, diagnostic.metadata);
}
