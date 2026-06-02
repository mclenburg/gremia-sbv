import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Startup-Bootstrap fuer sofortige sichtbare Rueckmeldung", () => {
  it("haelt electron/main.ts als schlanken Bootstrap ohne schwere Service- und IPC-Imports", () => {
    const bootstrap = read("electron/main.ts");

    expect(bootstrap).toContain('await showStartupSplash("app")');
    expect(bootstrap).toContain('await import("./appRuntime.js")');
    expect(bootstrap.indexOf('await showStartupSplash("app")')).toBeLessThan(
      bootstrap.indexOf('await import("./appRuntime.js")'),
    );
    expect(bootstrap).toContain('show: true');
    expect(bootstrap).toContain('markStartupPhase("splash:visible")');
    expect(bootstrap).toContain('void splash');
    expect(bootstrap).not.toContain('await splash.loadURL');

    expect(bootstrap).not.toContain("../services/securityService");
    expect(bootstrap).not.toContain("./ipc/");
    expect(bootstrap).not.toContain("registerCaseIpc");
    expect(bootstrap).not.toContain("prepareDemoVault");
    expect(bootstrap).not.toContain("nativeImage");
    expect(bootstrap).not.toContain("existsSync");
    expect(bootstrap).toContain("startupPerformance");
    expect(bootstrap).toContain("splash:visible");
  });

  it("verschiebt schwere Sicherheits-, Demo- und IPC-Initialisierung in appRuntime", () => {
    const runtime = read("electron/appRuntime.ts");

    expect(runtime).toContain("SecurityService");
    expect(runtime).toContain("prepareDemoVault");
    expect(runtime).toContain("registerCaseIpc");
    expect(runtime).toContain("registerSbvControlProtocolIpc");
    expect(runtime).toContain("export async function startApplication");
    expect(runtime).toContain("markStartupPhase");
    expect(runtime).toContain("runtime:ipc-registered");
    expect(runtime).toContain("prepareDemoVaultInBackground");
    expect(runtime).toContain("scheduleDemoVaultPreparation");
    expect(runtime).toContain("runtime:demo-vault-background-scheduled");
    expect(runtime).toContain("runtime:demo-vault-background-start");
    expect(runtime.indexOf('await createWindow()')).toBeLessThan(
      runtime.indexOf('scheduleDemoVaultPreparation(dataDirectory)'),
    );
    expect(runtime.indexOf('markStartupPhase("main-window:visible")')).toBeLessThan(
      runtime.indexOf('scheduleDemoVaultPreparation(dataDirectory)'),
    );
  });

  it("dokumentiert den Bootstrap-Vertrag im Architekturkonzept", () => {
    const docs = read("docs/ARCHITECTURE.md");

    expect(docs).toContain("electron/main.ts");
    expect(docs).toContain("schlanker Bootstrap");
    expect(docs).toContain("electron/appRuntime.ts");
    expect(docs).toContain("sofort eine sichtbare Rückmeldung");
  });
});
