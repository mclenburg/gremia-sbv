import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..', '..');
const projectRequire = createRequire(join(projectRoot, 'package.json'));
const isolatedToolsPackage = join(projectRoot, '.e2e-tools', 'package.json');

export function requireE2eTool<T = unknown>(specifier: string): T {
  try {
    return projectRequire(specifier) as T;
  } catch (projectError) {
    if (!existsSync(isolatedToolsPackage)) {
      throw projectError;
    }
    return createRequire(isolatedToolsPackage)(specifier) as T;
  }
}
