import { app, BrowserWindow, session } from "electron";

const DEV_RENDERER_ORIGINS = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

function isAllowedRendererUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (["file:", "devtools:", "data:", "blob:"].includes(url.protocol)) return true;
    if (
      !app.isPackaged &&
      url.protocol === "http:" &&
      DEV_RENDERER_ORIGINS.has(url.origin)
    )
      return true;
    if (
      !app.isPackaged &&
      url.protocol === "ws:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    )
      return true;
    return false;
  } catch {
    return false;
  }
}

export function buildContentSecurityPolicy(): string {
  const connectSrc = app.isPackaged
    ? "'self'"
    : "'self' http://127.0.0.1:5173 ws://127.0.0.1:5173 http://localhost:5173 ws://localhost:5173";
  const scriptSrc = app.isPackaged ? "'self'" : "'self' 'unsafe-eval'";
  return [
    "default-src 'self' file:",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: file:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function registerRendererSecurityPolicy(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  win.webContents.on("will-navigate", (event, url: string) => {
    const currentUrl = win.webContents.getURL();
    if (url === currentUrl) return;
    if (!isAllowedRendererUrl(url)) {
      event.preventDefault();
    }
  });

  win.webContents.on("will-redirect", (event, url) => {
    if (!isAllowedRendererUrl(url)) {
      event.preventDefault();
    }
  });
}

export function registerSessionSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [buildContentSecurityPolicy()],
        "X-Content-Type-Options": ["nosniff"],
        "Referrer-Policy": ["no-referrer"],
      },
    });
  });

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowedRendererUrl(details.url) });
  });
}
