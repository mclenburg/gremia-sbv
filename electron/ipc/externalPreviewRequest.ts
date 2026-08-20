export type ExternalPreviewOpener = (previewPath: string) => Promise<string>;

export function requestExternalPreview(previewPath: string, opener: ExternalPreviewOpener): boolean {
  try {
    void opener(previewPath).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
