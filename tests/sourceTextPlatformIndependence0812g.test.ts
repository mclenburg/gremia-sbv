import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function testFiles(dir = "tests"): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return entry.isFile() && entry.name.endsWith(".test.ts") ? [path.replaceAll("\\", "/")] : [];
  });
}

describe("source text tests stay platform independent", () => {
  it("does not assert multiline source snippets with raw platform-sensitive line endings", () => {
    const unsafeAssertions: string[] = [];
    const unsafePatterns = [
      /\.indexOf\(\s*["'`][^"'`]*\\n[^"'`]*["'`]\s*\)/g,
      /\.lastIndexOf\(\s*["'`][^"'`]*\\n[^"'`]*["'`]\s*\)/g,
      /\.toContain\(\s*["'`][^"'`]*\\n[^"'`]*["'`]\s*\)/g,
      /\.replace\(\s*\/\\r\\n\/g\s*,\s*["'`]\\n["'`]\s*\)/g,
    ];

    for (const file of testFiles()) {
      if (file.endsWith("sourceTextPlatformIndependence0812g.test.ts")) continue;
      const source = readFileSync(file, "utf8");
      for (const pattern of unsafePatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(source)) {
          unsafeAssertions.push(file);
          break;
        }
      }
    }

    expect(unsafeAssertions).toEqual([]);
  });

  it("provides a shared source normalizer for tests that inspect source files", () => {
    const helper = readFileSync("tests/helpers/sourceText.ts", "utf8");

    expect(helper).toContain("normalizeSourceText");
    expect(helper).toContain("replace(/\\r\\n?/g");
  });
});
