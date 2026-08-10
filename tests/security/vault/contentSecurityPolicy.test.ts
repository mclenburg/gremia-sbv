import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readCsp(): string {
  const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
  const match = html.match(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/>/i,
  );
  expect(match, 'index.html muss eine CSP als Meta-Policy enthalten').toBeTruthy();
  return match?.[1] ?? '';
}

describe('0.9.6-m Content-Security-Policy', () => {
  it('setzt eine restriktive Renderer-Policy ohne Script-Eval oder externe HTTP-Freigabe', () => {
    const csp = readCsp();

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toMatch(/connect-src[^;]*https?:/);
  });
});
