export type ShellPathOpener = (targetPath: string) => Promise<string>;

export interface ShellPathOpenResult {
  opened: boolean;
  error?: string;
}

function safeOpenPathError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'Der Betriebssystem-Aufruf konnte nicht ausgeführt werden.';
}

export async function requestShellPathOpen(
  targetPath: string,
  opener: ShellPathOpener,
): Promise<ShellPathOpenResult> {
  try {
    const error = await opener(targetPath);
    const trimmed = error.trim();
    return trimmed
      ? { opened: false, error: trimmed }
      : { opened: true };
  } catch (error) {
    return { opened: false, error: safeOpenPathError(error) };
  }
}
