import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("license readiness", () => {
  it("declares AGPL-3.0-or-later consistently for the project", () => {
    const pkg = JSON.parse(read("package.json")) as { license?: string };
    const license = read("LICENSE");
    const policy = read("docs/LICENSE_POLICY.md");
    const readme = read("README.md");

    expect(pkg.license).toBe("AGPL-3.0-or-later");
    expect(license).toContain("GNU AFFERO GENERAL PUBLIC LICENSE");
  });

  it("keeps third-party and data-protection boundaries explicit", () => {
    const notice = read("NOTICE");
    const policy = read("docs/LICENSE_POLICY.md");

    expect(notice).toContain("Third-party components");
    expect(notice).toContain("GDPR/DSGVO approval");
    expect(policy).toContain("Drittkomponenten");
    expect(policy).toContain("Keine datenschutzrechtliche Freigabe durch Lizenz");
  });
});
