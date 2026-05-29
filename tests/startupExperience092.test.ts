import { describe, expect, it } from "vitest";
import {
  buildStartupSplashHtml,
  buildStartupStatusScript,
  resolveStartupPhase,
  resolveStartupProgress,
  startupAlreadyRunningPhase,
  startupPhases,
} from "../electron/startupStatus";

describe("Startup Experience 0.9.2", () => {
  it("führt den Programmstart in sprechenden, geordneten Phasen", () => {
    expect(startupPhases.map((phase) => phase.id)).toEqual([
      "app",
      "policy",
      "storage",
      "demo",
      "security",
      "ipc",
      "ui",
      "ready",
    ]);

    expect(resolveStartupPhase("demo").label).toBe("Demoumgebung wird vorbereitet");
    expect(resolveStartupPhase("ready").description).toBe("Gremia.SBV ist bereit.");
    expect(resolveStartupProgress("app")).toBe(0);
    expect(resolveStartupProgress("ready")).toBe(100);
  });

  it("beschreibt erneute Startversuche als laufende Instanz statt als neues Programm", () => {
    const phase = resolveStartupPhase("already-running");

    expect(phase).toEqual(startupAlreadyRunningPhase);
    expect(phase.label).toBe("Gremia.SBV wird bereits gestartet");
    expect(phase.description).toContain("Vordergrund");
    expect(resolveStartupProgress("already-running")).toBeGreaterThan(0);
  });

  it("liefert ein kompaktes, barrierearmes Splash-Markup mit dunklem Default und Light-Mode-Variante", () => {
    const darkHtml = buildStartupSplashHtml("app");
    const lightHtml = buildStartupSplashHtml("app", "light");

    expect(darkHtml).toContain("Gremia.SBV wird gestartet");
    expect(darkHtml).toContain('<html lang="de" data-theme="dark">');
    expect(lightHtml).toContain('<html lang="de" data-theme="light">');
    expect(darkHtml).toContain('role="status"');
    expect(darkHtml).toContain('aria-live="polite"');
    expect(darkHtml).toContain('aria-label="Startfortschritt"');
    expect(darkHtml).toContain('aria-label="Startphasen"');
    expect(darkHtml).toContain('html[data-theme="light"]');
    expect(darkHtml).toContain("prefers-reduced-motion");
    expect(darkHtml).toContain("overflow: hidden");
    expect(darkHtml).toContain("grid-template-columns: repeat(2");
    expect(darkHtml).toContain("Der erste Demo-Start kann einen Moment dauern");
  });

  it("aktualisiert den Splash-Status über ein serialisiertes Statusskript", () => {
    const script = buildStartupStatusScript("ipc");

    expect(script).toContain("document.getElementById");
    expect(script).toContain("Arbeitsbereiche werden verbunden");
    expect(script).toContain("Fallakte, Fristen, Verfahren und Datenschutzmodule");
    expect(script).not.toContain("undefined");
  });
});
