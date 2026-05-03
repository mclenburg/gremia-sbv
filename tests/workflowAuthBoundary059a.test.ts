import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.5.9a auth boundary syntax fix", () => {
  it("extracts LoginGate and keeps DashboardOverview intact", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const loginGate = readFileSync("src/app/features/auth/LoginGate.tsx", "utf8");

    expect(existsSync("src/app/features/auth/LoginGate.tsx")).toBe(true);
    expect(loginGate).toContain("export function LoginGate");
    expect(loginGate).toContain("function RecoveryGate");
    expect(loginGate).toContain("function SecurityUnavailable");
    expect(workflow).not.toContain("export function LoginGate");
    expect(workflow).not.toContain("function RecoveryGate");
    expect(workflow).toContain("export function DashboardOverview");
    expect(workflow).not.toContain("industrial-shell fItems");
  });

  it("moves AuthMode into the auth boundary", () => {
    const authTypes = readFileSync("src/app/core/auth/authTypes.ts", "utf8");
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(authTypes).toContain("export type AuthMode");
    expect(app).toContain("import { LoginGate } from './features/auth/LoginGate'");
    expect(app).toContain("import type { AuthMode } from './core/auth/authTypes'");
    expect(app).not.toContain("type AuthMode");
  });

  it("removes auth-only icons from workflowViews while keeping shared warnings", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).not.toContain("LockKeyhole");
    expect(workflow).not.toContain("ShieldAlert");
    expect(workflow).not.toContain("<Lock ");
    expect(workflow).toContain("AlertTriangle");
  });
});
