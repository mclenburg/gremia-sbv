import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildStartupSplashHtml } from '../../../electron/startupStatus';
import {
  allowsInlineTrustedStylesForDocumentUrl,
  buildRendererContentSecurityPolicy,
  isAllowedRendererNavigationUrl,
  isAllowedRendererRequestUrl,
  isStartupSplashDocumentUrl,
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

  it('beschränkt Entwicklungsfreigaben auf den lokalen Vite-Renderer und erlaubt dessen Laufzeit-Styles nur außerhalb des Pakets', () => {
    expect(isAllowedRendererNavigationUrl('http://127.0.0.1:5173/', false)).toBe(true);
    expect(isAllowedRendererNavigationUrl('http://localhost:5173/cases', false)).toBe(true);
    expect(isAllowedRendererNavigationUrl('http://127.0.0.1:8080/', false)).toBe(false);
    expect(isAllowedRendererRequestUrl('ws://localhost:5173/socket', false)).toBe(true);
    expect(isAllowedRendererRequestUrl('https://example.invalid/', false)).toBe(false);

    const developmentCsp = buildRendererContentSecurityPolicy(false);
    expect(developmentCsp).toContain("script-src 'self' 'unsafe-eval'");
    expect(developmentCsp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('erlaubt Inline-Styles für den intern markierten Splash, aber nicht für beliebige data-Dokumente', () => {
    const splashUrl = `data:text/html;charset=utf-8,${encodeURIComponent(buildStartupSplashHtml('app'))}`;
    const arbitraryDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent('<!doctype html><style>body{color:red}</style>')}`;

    expect(isStartupSplashDocumentUrl(splashUrl)).toBe(true);
    expect(allowsInlineTrustedStylesForDocumentUrl(splashUrl)).toBe(true);
    expect(isStartupSplashDocumentUrl(arbitraryDataUrl)).toBe(false);
    expect(allowsInlineTrustedStylesForDocumentUrl(arbitraryDataUrl)).toBe(false);

    const splashCsp = buildRendererContentSecurityPolicy(true, allowsInlineTrustedStylesForDocumentUrl(splashUrl));
    expect(splashCsp).toContain("style-src 'self' 'unsafe-inline'");
    expect(splashCsp).toContain("script-src 'self'");
    expect(splashCsp).not.toContain("script-src 'self' 'unsafe-eval'");
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
