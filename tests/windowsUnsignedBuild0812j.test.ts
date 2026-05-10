import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const project = JSON.parse(readFileSync("package.json", "utf8"));
const buildDocs = readFileSync("docs/BUILD.md", "utf8");

describe("Windows RC build contract", () => {
  it("builds only the portable Windows executable and no installer", () => {
    expect(project.build.win.signAndEditExecutable).toBe(false);
    expect(project.build.win.target).toEqual([
      expect.objectContaining({ target: "portable" }),
    ]);
    expect(JSON.stringify(project.build.win.target)).not.toContain("nsis");
    expect(project.build.nsis).toBeUndefined();
  });

  it("keeps native dependency rebuild independent from Windows executable resource editing", () => {
    expect(project.scripts.postinstall).toBe("electron-builder install-app-deps");
    expect(project.scripts.postinstall).not.toContain("npx");
    expect(buildDocs).toContain("signAndEditExecutable");
    expect(buildDocs).toContain("Cannot create symbolic link");
    expect(buildDocs).toContain("postinstall");
    expect(buildDocs).toContain("portable Direktstart-EXE");
  });
});
