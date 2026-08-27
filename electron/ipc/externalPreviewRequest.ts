import { requestShellPathOpen, type ShellPathOpener } from './shellOpenPath.js';

export type ExternalPreviewOpener = ShellPathOpener;

export async function requestExternalPreview(previewPath: string, opener: ExternalPreviewOpener): Promise<boolean> {
  return (await requestShellPathOpen(previewPath, opener)).opened;
}
