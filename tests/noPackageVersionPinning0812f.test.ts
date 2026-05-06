import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function collectTestFiles(directory: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      result.push(...collectTestFiles(fullPath));
      continue;
    }
    if (/\.test\.tsx?$/.test(entry)) {
      result.push(fullPath.replaceAll("\\", "/"));
    }
  }
  return result;
}

function isVersionAssertion(line: string): boolean {
  const assertionOnPackageVersion = /expect\([^)]*(?:pkg|packageJson|project)\.version[^)]*\)\.to(?:Be|Equal|StrictEqual|Match|Contain)\s*\(/.test(line);
  const assertionAgainstConcreteVersion = /expect\([^)]*version[^)]*\)\.to(?:Be|Equal|StrictEqual|Match|Contain)\s*\(\s*(?:["'`]\d+\.\d+\.\d+|\/\^?\d+\\\.\d+)/.test(line);
  return assertionOnPackageVersion || assertionAgainstConcreteVersion;
}

describe("test version discipline", () => {
  it("does not use the package version as a stable product contract", () => {
    const allowedFiles = new Set([
      "tests/appVersion.test.ts",
      "tests/noPackageVersionPinning0812f.test.ts",
    ]);
    const offenders = collectTestFiles("tests")
      .filter((file) => !allowedFiles.has(file))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        const lines = source.split(/\r?\n/);
        return lines
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => isVersionAssertion(line))
          .map(({ line, index }) => `${file}:${index + 1}: ${line.trim()}`);
      });

    expect(offenders).toEqual([]);
  });

  it("keeps the native dependency postinstall contract without using the version as a proxy", () => {
    const project = JSON.parse(readFileSync("package.json", "utf8"));

    expect(project.scripts.postinstall).toBe("electron-builder install-app-deps");
    expect(project.scripts.postinstall).not.toContain("npx");
  });
});
