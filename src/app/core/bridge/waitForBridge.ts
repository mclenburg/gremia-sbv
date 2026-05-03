function getBridge(): Window['gremiaSbv'] | null {
  return window.gremiaSbv ?? null;
}

export async function waitForBridge(timeoutMs = 2500): Promise<Window['gremiaSbv'] | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const bridge = getBridge();
    if (bridge?.security) return bridge;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return getBridge();
}
