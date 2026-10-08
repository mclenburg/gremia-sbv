import { app, BrowserWindow, session } from "electron";
import {
  buildRendererContentSecurityPolicy,
  isAllowedRendererNavigationUrl,
  isAllowedRendererRequestUrl,
  allowsInlineTrustedStylesForDocumentUrl,
} from './rendererSecurityPolicy.js';

export function buildContentSecurityPolicy(url?: string): string {
  return buildRendererContentSecurityPolicy(
    app.isPackaged,
    typeof url === 'string' && allowsInlineTrustedStylesForDocumentUrl(url),
  );
}

export function registerRendererSecurityPolicy(win: BrowserWindow, trustedDocumentUrl?: string): void {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  win.webContents.on("will-navigate", (event, url: string) => {
    if (!isAllowedRendererNavigationUrl(url, app.isPackaged, trustedDocumentUrl)) event.preventDefault();
  });

  win.webContents.on("will-redirect", (event, url) => {
    if (!isAllowedRendererNavigationUrl(url, app.isPackaged, trustedDocumentUrl)) event.preventDefault();
  });
}

export function registerSessionSecurityPolicy(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [buildContentSecurityPolicy(details.url)],
        "X-Content-Type-Options": ["nosniff"],
        "Referrer-Policy": ["no-referrer"],
        "Permissions-Policy": ["camera=(), microphone=(), geolocation=(), usb=(), serial=(), bluetooth=()"],
      },
    });
  });

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowedRendererRequestUrl(details.url, app.isPackaged) });
  });
}
export { startMainSessionLock } from './mainSessionLock.js';
