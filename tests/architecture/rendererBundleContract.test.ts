import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function fixture(mainBytes: number, dynamicSources: string[]) {
  const root = mkdtempSync(join(tmpdir(), "gremia-bundle-"));
  mkdirSync(join(root, "dist", ".vite"), { recursive: true });
  mkdirSync(join(root, "dist", "assets"), { recursive: true });
  mkdirSync(join(root, "maintenance", "bundle"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, "scripts", "check-renderer-bundle.cjs"), readFileSync(join(process.cwd(), "scripts", "check-renderer-bundle.cjs")));
  const required = dynamicSources;
  writeFileSync(join(root, "maintenance", "bundle", "renderer-bundle-contract.json"), JSON.stringify({
    schemaVersion: 1,
    maximumMainChunkBytes: 100,
    maximumMainShareOfJavascript: 0.82,
    minimumDynamicChunks: required.length,
    requiredLazyFeatureSources: required,
  }));
  const manifest: Record<string, unknown> = {
    "src/main.tsx": { file: "assets/main.js", isEntry: true },
  };
  writeFileSync(join(root, "dist", "assets", "main.js"), Buffer.alloc(mainBytes));
  dynamicSources.forEach((source, index) => {
    manifest[source] = { file: `assets/lazy-${index}.js`, src: source, isDynamicEntry: true };
    writeFileSync(join(root, "dist", "assets", `lazy-${index}.js`), Buffer.alloc(50));
  });
  writeFileSync(join(root, "dist", ".vite", "manifest.json"), JSON.stringify(manifest));
  return root;
}

function run(root: string) {
  return spawnSync(process.execPath, ["scripts/check-renderer-bundle.cjs"], { cwd: root, encoding: "utf8" });
}

describe("Renderer-Bundle-Vertrag", () => {
  it("akzeptiert einen kleinen Einstieg und nachgewiesene dynamische Feature-Chunks", () => {
    const root = fixture(80, ["feature-a.tsx", "feature-b.tsx"]);
    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Renderer-Bundle OK");
  });

  it("verweigert einen übergroßen Hauptchunk", () => {
    const root = fixture(101, ["feature-a.tsx", "feature-b.tsx"]);
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Hauptchunk");
  });

  it("verweigert fehlende vereinbarte Lazy-Feature-Chunks", () => {
    const root = fixture(80, ["feature-a.tsx"]);
    const contractPath = join(root, "maintenance", "bundle", "renderer-bundle-contract.json");
    const contract = JSON.parse(readFileSync(contractPath, "utf8"));
    contract.requiredLazyFeatureSources.push("missing.tsx");
    writeFileSync(contractPath, JSON.stringify(contract));
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Lazy-Feature-Quellen fehlen");
  });
});
