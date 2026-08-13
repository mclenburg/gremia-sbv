export const DEV_RENDERER_ORIGINS = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);

function parsedUrl(rawUrl: string): URL | null {
  try { return new URL(rawUrl); } catch { return null; }
}

export function isAllowedRendererNavigationUrl(rawUrl: string, packaged: boolean): boolean {
  const url = parsedUrl(rawUrl);
  if (!url) return false;
  if (packaged) return url.protocol === 'file:';
  return url.protocol === 'file:' || (url.protocol === 'http:' && DEV_RENDERER_ORIGINS.has(url.origin));
}

export function isAllowedRendererRequestUrl(rawUrl: string, packaged: boolean): boolean {
  const url = parsedUrl(rawUrl);
  if (!url) return false;
  if (['file:', 'data:', 'blob:'].includes(url.protocol)) return true;
  if (!packaged && url.protocol === 'devtools:') return true;
  if (!packaged && url.protocol === 'http:' && DEV_RENDERER_ORIGINS.has(url.origin)) return true;
  if (!packaged && url.protocol === 'ws:' && ['127.0.0.1', 'localhost'].includes(url.hostname)) return true;
  return false;
}

export function isReportRenderDocumentUrl(rawUrl: string): boolean {
  const url = parsedUrl(rawUrl);
  if (!url || url.protocol !== 'file:') return false;
  const normalizedPath = decodeURIComponent(url.pathname).replace(/\\/g, '/').toLowerCase();
  return normalizedPath.includes('/tmp/report-render/');
}

export function buildRendererContentSecurityPolicy(packaged: boolean, allowInlineReportStyles = false): string {
  const connectSrc = packaged
    ? "'self'"
    : "'self' http://127.0.0.1:5173 ws://127.0.0.1:5173 http://localhost:5173 ws://localhost:5173";
  const scriptSrc = packaged ? "'self'" : "'self' 'unsafe-eval'";
  return [
    "default-src 'self' file:",
    `script-src ${scriptSrc}`,
    `style-src 'self'${allowInlineReportStyles ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data: blob: file:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "worker-src 'none'",
  ].join('; ');
}
