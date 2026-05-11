import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type TestQualityCategory = 'behavior' | 'source_string';

export type TestQualityFile = {
  file: string;
  category: TestQualityCategory;
};

function collectFiles(dir: string, suffix: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) return collectFiles(path, suffix);
    return entry.isFile() && entry.name.endsWith(suffix) ? [path] : [];
  });
}

function isSourceStringTest(file: string, source: string): boolean {
  if (!file.startsWith('tests/')) return false;
  const readsProjectSource = /readFileSync\(|readNormalizedSourceText\(/.test(source);
  const assertsRawSourceText = /\.toContain\(|\.not\.toContain\(|\.toMatch\(/.test(source);
  const importsRealSubject = /from ['"]\.\.\/(services|src|electron|scripts|database)\//.test(source);
  return readsProjectSource && assertsRawSourceText && !importsRealSubject;
}

export function collectTestQualityFiles(): TestQualityFile[] {
  const unitTests = collectFiles('tests', '.test.ts');
  const e2eTests = collectFiles('e2e', '.spec.ts');
  return [...unitTests, ...e2eTests].map((file) => {
    const source = readFileSync(file, 'utf8');
    return { file, category: isSourceStringTest(file, source) ? 'source_string' : 'behavior' };
  });
}

export function summarizeTestQuality(files = collectTestQualityFiles()) {
  const behavior = files.filter((entry) => entry.category === 'behavior');
  const sourceString = files.filter((entry) => entry.category === 'source_string');
  const total = files.length;
  return {
    total,
    behavior: behavior.length,
    sourceString: sourceString.length,
    behaviorRatio: total === 0 ? 0 : behavior.length / total,
    sourceStringRatio: total === 0 ? 0 : sourceString.length / total,
    sourceStringFiles: sourceString.map((entry) => entry.file).sort(),
  };
}
