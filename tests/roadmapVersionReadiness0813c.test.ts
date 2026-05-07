import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const roadmap = readFileSync("docs/ROADMAP.md", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

describe("RC roadmap readiness", () => {
  it("keeps the roadmap status aligned with package metadata without hard-coded version assertions", () => {
    expect(roadmap).toContain(`Stand: **${pkg.version}**`);
  });

  it("documents complete RC coverage for living protocol links", () => {
    for (const command of ["`/bem`", "`/praev`", "`/bet`", "`/kuend`", "`/gleich`", "`/anp`", "`/fr`"])
      expect(roadmap).toContain(command);
    expect(roadmap).not.toContain("Post-RC-Ausbau");
  });
});
