import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { version?: string; resolved?: string }>;
};
const postcssConfig = readFileSync('postcss.config.js', 'utf8');

function versionStartsWith(value: string | undefined, prefix: string): boolean {
  return typeof value === 'string' && value.startsWith(prefix);
}

describe('Tailwind 4 PostCSS-Vertrag', () => {
  it('nutzt den ausgelagerten Tailwind-PostCSS-Adapter statt tailwindcss direkt als PostCSS-Plugin', () => {
    expect(postcssConfig.includes("'@tailwindcss/postcss'")).toBe(true);
    expect(postcssConfig.includes('autoprefixer')).toBe(true);
    expect(/plugins:\s*\{\s*tailwindcss\s*:/.test(postcssConfig)).toBe(false);
  });

  it('führt den Tailwind-PostCSS-Adapter als Build-Werkzeug in den devDependencies und im Lockfile', () => {
    expect(packageJson.dependencies?.['@tailwindcss/postcss']).toBeUndefined();
    expect(versionStartsWith(packageJson.devDependencies?.['@tailwindcss/postcss'], '^4.')).toBe(true);
    expect(versionStartsWith(packageLock.packages['node_modules/@tailwindcss/postcss']?.version, '4.')).toBe(true);
    expect(versionStartsWith(packageJson.devDependencies?.lightningcss, '^1.')).toBe(true);
    expect(packageLock.packages['node_modules/lightningcss-linux-x64-gnu']?.version).toBe('1.32.0');
  });

  it('vermeidet interne Paketquellen auch für den Tailwind-PostCSS-Adapter', () => {
    const adapter = packageLock.packages['node_modules/@tailwindcss/postcss'];

    expect(adapter?.resolved).toBe('https://registry.npmjs.org/@tailwindcss/postcss/-/postcss-4.3.0.tgz');
    expect(adapter?.resolved?.includes('applied-caas-gateway')).toBe(false);
    expect(adapter?.resolved?.includes('artifactory/api/npm/npm-public')).toBe(false);
  });
});
