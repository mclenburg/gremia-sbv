import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildRendererContentSecurityPolicy,
  isAllowedRendererNavigationUrl,
  isAllowedRendererRequestUrl,
  isReportRenderDocumentUrl,
} from '../../../electron/security/rendererSecurityPolicy';

function readMetaCsp(): string {
  const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
  const match = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/>/i);
  expect(match, 'index.html muss eine CSP als Meta-Policy enthalten').toBeTruthy();
  return match?.[1] ?? '';
}

describe('Renderer-Sicherheitsgrenze', () => {
  it('erlaubt in der gepackten App nur lokale Navigation und blockiert externe Renderer-Netzwerkziele', () => {
    expect(isAllowedRendererNavigationUrl('file:///opt/gremia/dist/index.html', true)).toBe(true);
    expect(isAllowedRendererNavigationUrl('data:text/html,attack', true)).toBe(false);
    expect(isAllowedRendererNavigationUrl('blob:https://evil.invalid/id', true)).toBe(false);
    expect(isAllowedRendererNavigationUrl('https://evil.invalid/', true)).toBe(false);

    expect(isAllowedRendererRequestUrl('file:///opt/gremia/dist/app.js', true)).toBe(true);
    expect(isAllowedRendererRequestUrl('data:image/png;base64,AA==', true)).toBe(true);
    expect(isAllowedRendererRequestUrl('blob:file:///local-id', true)).toBe(true);
    expect(isAllowedRendererRequestUrl('https://evil.invalid/collect', true)).toBe(false);
    expect(isAllowedRendererRequestUrl('ws://localhost:5173', true)).toBe(false);
  });

  it('beschränkt Entwicklungsfreigaben auf den lokalen Vite-Renderer', () => {
    expect(isAllowedRendererNavigationUrl('http://127.0.0.1:5173/', false)).toBe(true);
    expect(isAllowedRendererNavigationUrl('http://localhost:5173/cases', false)).toBe(true);
    expect(isAllowedRendererNavigationUrl('http://127.0.0.1:8080/', false)).toBe(false);
    expect(isAllowedRendererRequestUrl('ws://localhost:5173/socket', false)).toBe(true);
    expect(isAllowedRendererRequestUrl('https://example.invalid/', false)).toBe(false);
  });

  it('erlaubt Inline-Styles ausschließlich für die lokale Report-Renderdatei', () => {
    const reportRenderUrl = pathToFileURL(path.join(os.tmpdir(), 'vault', 'tmp', 'report-render', 'report.html')).toString();
    const reportPreviewUrl = pathToFileURL(path.join(os.tmpdir(), 'vault', 'tmp', 'report-preview', 'report.html')).toString();
    expect(isReportRenderDocumentUrl(reportRenderUrl)).toBe(true);
    expect(isReportRenderDocumentUrl(reportPreviewUrl)).toBe(false);
    expect(isReportRenderDocumentUrl('https://example.invalid/report-render/report.html')).toBe(false);

    const reportCsp = buildRendererContentSecurityPolicy(true, true);
    expect(reportCsp).toContain("style-src 'self' 'unsafe-inline'");
    expect(reportCsp).not.toContain("script-src 'self' 'unsafe-eval'");
  });

  it('erzeugt für Produktion eine CSP ohne Eval, Inline-Styles, Formulare, Frames oder Worker', () => {
    const csp = buildRendererContentSecurityPolicy(true);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("worker-src 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("'unsafe-inline'");
  });

  it('hält auch die statische Meta-CSP ohne Inline-Style-, Formular- oder Worker-Freigabe', () => {
    const csp = readMetaCsp();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("worker-src 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toMatch(/connect-src[^;]*https?:/);
  });
});
