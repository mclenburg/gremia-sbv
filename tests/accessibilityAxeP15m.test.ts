import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('P15m Axe accessibility gate', () => {
  it('bindet einen Axe-E2E-Scan für primäre Arbeitsbereiche ein', () => {
    expect(existsSync('e2e/accessibility-axe.spec.ts')).toBe(true);
    const spec = read('e2e/accessibility-axe.spec.ts');
    expect(spec).toContain("@axe-core/playwright");
    expect(spec).toContain('VISUAL_QA_ROUTES');
    expect(spec).toContain("wcag2a");
    expect(spec).toContain("wcag21aa");
    expect(spec).toContain('serious');
    expect(spec).toContain('critical');
    expect(spec).toContain('inline-command-help-dialog');
  });

  it('macht das Axe-Gate installierbar und releasefähig', () => {
    const pkg = read('package.json');
    expect(pkg).toContain('@axe-core/playwright@4.10.2');
    expect(pkg).toContain('test:e2e:a11y');
    expect(pkg).toContain('release:check:a11y');
    expect(pkg).toContain('test:e2e:a11y');

    const workflow = read('.github/workflows/build-release.yml');
    expect(workflow).toContain('npm run test:e2e:setup');
    expect(workflow).toContain('npm run test:e2e:a11y');
  });

  it('dokumentiert Axe als Accessibility-Vertrag', () => {
    const qualityGate = read('docs/QUALITY_GATE.md');
    expect(qualityGate).toContain('Axe');
    expect(qualityGate).toContain('serious/critical WCAG-Verstöße');
    expect(qualityGate).toContain('npm run test:e2e:a11y');

    const readme = read('README.md');
    expect(readme).toContain('Axe-Scan');

    const contributing = read('CONTRIBUTING.md');
    expect(contributing).toContain('npm run test:e2e:a11y');
  });
});
