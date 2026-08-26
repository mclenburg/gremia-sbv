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
