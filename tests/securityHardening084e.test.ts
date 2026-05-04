import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("0.8.4-e security/autolock/tempfile hardening", () => {
  it("uses sandboxed Electron renderer and central security policy", () => {
    const main = read("electron/main.ts");
    const policy = read("electron/security/electronSecurity.ts");
    expect(main).toContain("sandbox: true");
    expect(main).toContain("registerRendererSecurityPolicy(win)");
    expect(main).toContain("registerSessionSecurityPolicy()");
    expect(policy).toContain("setWindowOpenHandler");
    expect(policy).toContain("will-navigate");
    expect(policy).toContain("Content-Security-Policy");
    expect(policy).toContain("object-src 'none'");
  });

  it("adds central auto-lock hook with ten minute default", () => {
    const hook = read("src/app/core/security/useAutoLock.ts");
    const app = read("src/app/App.tsx");
    expect(hook).toContain("AUTO_LOCK_TIMEOUT_MS = 10 * 60 * 1000");
    expect(hook).toContain("bridge?.security?.lock?.(reason)");
    expect(app).toContain("useAutoLock({");
    expect(app).toContain("switchToLockedSession");
  });

  it("centralizes temporary plaintext work copies", () => {
    const tempService = read("services/tempFileService.ts");
    const caseService = read("services/caseService.ts");
    const reportIpc = read("electron/ipc/reportIpc.ts");
    const securityService = read("services/securityService.ts");
    expect(tempService).toContain("export class TempFileService");
    expect(tempService).toContain("'document-preview'");
    expect(tempService).toContain("'report-preview'");
    expect(caseService).toContain(
      "new TempFileService(this.dataDirProvider())",
    );
    expect(reportIpc).toContain("security.writeTemporaryFile(");
    expect(securityService).toContain("cleanupTemporaryFiles()");
    expect(securityService).toContain("temporaryFileStatus()");
  });

  it("surfaces temporary files in UI and integrity report", () => {
    const workflow = read("src/app/workflowViews.tsx");
    const reportService = read("services/reportService.ts");
    expect(workflow).toContain("TemporaryFilesSettingsPanel");
    expect(workflow).toContain("Temporäre Dateien jetzt löschen");
    expect(reportService).toContain("Temporäre Klartext-Arbeitskopien");
    expect(reportService).toContain("new TempFileService(dataDir).status()");
  });
});
