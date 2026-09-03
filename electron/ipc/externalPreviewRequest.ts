import { shell } from 'electron';
import { requestShellPathOpen, type ShellPathOpener } from './shellOpenPath.js';

export type ExternalPreviewOpener = ShellPathOpener;

export function createExternalPreviewOpener(environment = process.env): ExternalPreviewOpener {
  return environment.GREMIA_SBV_E2E === '1'
    ? async () => ''
    : (previewPath) => shell.openPath(previewPath);
}

export async function requestExternalPreview(previewPath: string, opener: ExternalPreviewOpener): Promise<boolean> {
  return (await requestShellPathOpen(previewPath, opener)).opened;
}
