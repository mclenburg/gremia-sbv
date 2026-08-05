import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

function inspectBootstrap(bootstrap: string) {
  const splash = 'await showStartupSplash("app")';
  const runtimeImport = 'await import("./appRuntime.js")';
  return {
    showsSplashBeforeRuntimeImport: bootstrap.includes(splash)
      && bootstrap.includes(runtimeImport)
      && bootstrap.indexOf(splash) < bootstrap.indexOf(runtimeImport),
    splashIsImmediatelyVisible: ["show: true", 'markStartupPhase("splash:visible")', "void splash"].every((entry) => bootstrap.includes(entry))
      && !bootstrap.includes("await splash.loadURL"),
    remainsLightweight: [
      "../services/securityService",
      "./ipc/",
      "registerCaseIpc",
      "prepareDemoVault",
      "nativeImage",
      "existsSync",
    ].every((entry) => !bootstrap.includes(entry)),
    performanceMarkersPresent: bootstrap.includes("startupPerformance") && bootstrap.includes("splash:visible"),
  };
}

function inspectRuntime(runtime: string) {
  const createWindow = "await createWindow()";
  const mainWindowVisible = 'markStartupPhase("main-window:visible")';
  const scheduleDemo = "scheduleDemoVaultPreparation(dataDirectory)";
  return {
    ownsHeavyInitialization: [
      "SecurityService",
      "prepareDemoVault",
      "registerCaseIpc",
      "registerSbvControlProtocolIpc",
      "export async function startApplication",
    ].every((entry) => runtime.includes(entry)),
    exposesStartupTelemetry: ["markStartupPhase", "runtime:ipc-registered"].every((entry) => runtime.includes(entry)),
    schedulesDemoWorkInBackground: [
      "prepareDemoVaultInBackground",
      "scheduleDemoVaultPreparation",
      "runtime:demo-vault-background-scheduled",
      "runtime:demo-vault-background-start",
    ].every((entry) => runtime.includes(entry)),
    demoWorkStartsAfterVisibleWindow: runtime.indexOf(createWindow) >= 0
      && runtime.indexOf(mainWindowVisible) >= 0
      && runtime.indexOf(scheduleDemo) > runtime.indexOf(createWindow)
      && runtime.indexOf(scheduleDemo) > runtime.indexOf(mainWindowVisible),
  };
}

describe("Startup-Bootstrap für sofortige sichtbare Rückmeldung", () => {
  it("hält den Bootstrap klein und verschiebt schwere Initialisierung hinter das sichtbare Fenster", () => {
    expect(inspectBootstrap(read("electron/main.ts"))).toEqual({
      showsSplashBeforeRuntimeImport: true,
      splashIsImmediatelyVisible: true,
      remainsLightweight: true,
      performanceMarkersPresent: true,
    });
    expect(inspectRuntime(read("electron/appRuntime.ts"))).toEqual({
      ownsHeavyInitialization: true,
      exposesStartupTelemetry: true,
      schedulesDemoWorkInBackground: true,
      demoWorkStartsAfterVisibleWindow: true,
    });
  });

  it("dokumentiert den Bootstrap-Vertrag", () => {
    const docs = read("docs/ARCHITECTURE.md");
    expect({
      bootstrap: docs.includes("electron/main.ts") && docs.includes("schlanker Bootstrap"),
      runtime: docs.includes("electron/appRuntime.ts"),
      visibleFeedback: docs.includes("sofort eine sichtbare Rückmeldung"),
    }).toEqual({ bootstrap: true, runtime: true, visibleFeedback: true });
  });
});
