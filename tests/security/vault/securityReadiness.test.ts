import type { BrowserWindow } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerRendererSecurityPolicy, registerSessionSecurityPolicy } from '../../../electron/security/electronSecurity';

type HeadersHandler = (
  details: { url: string; responseHeaders: Record<string, string[]> },
  callback: (response: { responseHeaders: Record<string, string[]> }) => void,
) => void;
type RequestHandler = (details: { url: string }, callback: (response: { cancel: boolean }) => void) => void;

const boundary = vi.hoisted(() => ({
  app: { isPackaged: true },
  headers: vi.fn<(handler: HeadersHandler) => void>(),
  requests: vi.fn<(handler: RequestHandler) => void>(),
}));
vi.mock('electron', () => ({
  app: boundary.app,
  session: { defaultSession: { webRequest: { onHeadersReceived: boundary.headers, onBeforeRequest: boundary.requests } } },
}));

describe('Electron security boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    boundary.app.isPackaged = true;
  });

  it('adds enforced security headers to session responses while preserving existing headers', () => {
    registerSessionSecurityPolicy();
    const callback = vi.fn();
    boundary.headers.mock.calls[0][0]({
      url: 'file:///app/index.html',
      responseHeaders: { 'Content-Type': ['text/html'], 'Content-Security-Policy': ["default-src * 'unsafe-eval'"] },
    }, callback);

    const headers = callback.mock.calls[0][0].responseHeaders as Record<string, string[]>;
    expect(headers['Content-Type']).toEqual(['text/html']);
    expect(headers['X-Content-Type-Options']).toEqual(['nosniff']);
    expect(headers['Referrer-Policy']).toEqual(['no-referrer']);
    const directives = new Map(headers['Content-Security-Policy'][0].split(';').map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, sources] as const;
    }));
    expect(directives.get('script-src')).toEqual(["'self'"]);
    expect(directives.get('connect-src')).toEqual(["'self'"]);
    expect(directives.get('frame-src')).toEqual(["'none'"]);
  });

  it.each([
    ['file:///app/main.js', false],
    ['https://external.invalid/collect', true],
    ['ws://localhost:5173/socket', true],
  ])('enforces the packaged network boundary for %s', (url, cancel) => {
    registerSessionSecurityPolicy();
    const callback = vi.fn();
    boundary.requests.mock.calls[0][0]({ url }, callback);
    expect(callback).toHaveBeenCalledExactlyOnceWith({ cancel });
  });

  it('denies new windows and external navigation while permitting the current local document', () => {
    const handlers = new Map<string, (event: { preventDefault: () => void }, url: string) => void>();
    const openWindow = vi.fn();
    const currentUrl = 'file:///app/index.html';
    const win = {
      webContents: {
        setWindowOpenHandler: openWindow,
        getURL: () => currentUrl,
        on: (event: string, handler: (event: { preventDefault: () => void }, url: string) => void) => handlers.set(event, handler),
      },
    };
    registerRendererSecurityPolicy(win as unknown as BrowserWindow);
    expect(openWindow.mock.calls[0][0]()).toEqual({ action: 'deny' });
    const preventDefault = vi.fn();
    handlers.get('will-navigate')?.({ preventDefault }, currentUrl);
    expect(preventDefault).not.toHaveBeenCalled();
    handlers.get('will-navigate')?.({ preventDefault }, 'https://external.invalid/');
    expect(preventDefault).toHaveBeenCalledTimes(1);
    handlers.get('will-redirect')?.({ preventDefault }, 'https://external.invalid/');
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });
});
