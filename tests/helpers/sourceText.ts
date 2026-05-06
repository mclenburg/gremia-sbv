import { readFileSync } from "node:fs";

export function normalizeSourceText(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function readNormalizedSourceText(path: string): string {
  return normalizeSourceText(readFileSync(path, "utf8"));
}

export function indexOfPattern(source: string, pattern: RegExp): number {
  const match = pattern.exec(normalizeSourceText(source));
  return match?.index ?? -1;
}
