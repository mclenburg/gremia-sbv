import { startupSplashStyles } from "./startupSplashStyles.js";

export type StartupPhaseId =
  | "app"
  | "policy"
  | "storage"
  | "demo"
  | "security"
  | "ipc"
  | "ui"
  | "ready"
  | "already-running";

export interface StartupPhase {
  readonly id: StartupPhaseId;
  readonly label: string;
  readonly description: string;
}

export const startupPhases: readonly StartupPhase[] = [
  {
    id: "app",
    label: "Anwendung startet",
    description: "Gremia.SBV initialisiert die lokale Arbeitsumgebung.",
  },
  {
    id: "policy",
    label: "Schutzmechanismen werden gesetzt",
    description: "Fenster-, Sitzungs- und Sicherheitsregeln werden vorbereitet.",
  },
  {
    id: "storage",
    label: "Lokaler Datenbereich wird geöffnet",
    description: "Die geschützte Offline-Ablage wird geprüft.",
  },
  {
    id: "demo",
    label: "Demoumgebung wird vorbereitet",
    description: "Demo-Daten werden zurückgesetzt und kontrolliert neu aufgebaut.",
  },
  {
    id: "security",
    label: "Tresor wird vorbereitet",
    description: "Verschlüsselung und Zugriffsschutz werden initialisiert.",
  },
  {
    id: "ipc",
    label: "Arbeitsbereiche werden verbunden",
    description: "Fallakte, Fristen, Verfahren und Datenschutzmodule werden angebunden.",
  },
  {
    id: "ui",
    label: "Oberfläche wird aufgebaut",
    description: "Das Arbeitsfenster wird geladen und sichtbar gemacht.",
  },
  {
    id: "ready",
    label: "Start abgeschlossen",
    description: "Gremia.SBV ist bereit.",
  },
];

export const startupAlreadyRunningPhase: StartupPhase = {
  id: "already-running",
  label: "Gremia.SBV wird bereits gestartet",
  description: "Die laufende Instanz wird in den Vordergrund geholt.",
};

export function resolveStartupPhase(phaseId: StartupPhaseId): StartupPhase {
  if (phaseId === startupAlreadyRunningPhase.id) return startupAlreadyRunningPhase;
  return startupPhases.find((phase) => phase.id === phaseId) ?? startupPhases[0];
}

export function resolveStartupProgress(phaseId: StartupPhaseId): number {
  if (phaseId === "already-running") return 12;
  const index = startupPhases.findIndex((phase) => phase.id === phaseId);
  if (index < 0) return 0;
  if (startupPhases.length <= 1) return 100;
  return Math.round((index / (startupPhases.length - 1)) * 100);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildStartupStatusScript(phaseId: StartupPhaseId): string {
  const phase = resolveStartupPhase(phaseId);
  const progress = resolveStartupProgress(phaseId);
  return `(() => {
    const state = ${JSON.stringify({
      id: phase.id,
      label: phase.label,
      description: phase.description,
      progress,
    })};
    const title = document.getElementById("startup-status-label");
    const description = document.getElementById("startup-status-description");
    const progress = document.getElementById("startup-progress");
    const progressText = document.getElementById("startup-progress-text");
    if (title) title.textContent = state.label;
    if (description) description.textContent = state.description;
    if (progress instanceof HTMLProgressElement) progress.value = state.progress;
    if (progressText) progressText.textContent = state.progress + " %";
    document.querySelectorAll("[data-startup-step]").forEach((item) => {
      item.setAttribute("data-active", item.getAttribute("data-startup-step") === state.id ? "true" : "false");
    });
  })();`;
}

export type StartupSplashTheme = "dark" | "light";

export function buildStartupSplashHtml(
  initialPhaseId: StartupPhaseId,
  theme: StartupSplashTheme = "dark",
): string {
  const phase = resolveStartupPhase(initialPhaseId);
  const progress = resolveStartupProgress(initialPhaseId);
  const safeTheme: StartupSplashTheme = theme === "light" ? "light" : "dark";
  const steps = startupPhases
    .map((step) => `<li data-startup-step="${escapeHtml(step.id)}" data-active="${step.id === phase.id ? "true" : "false"}"><span>${escapeHtml(step.label)}</span></li>`)
    .join("");

  return `<!doctype html>
<html lang="de" data-theme="${safeTheme}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="gremia-startup-splash" content="1" /><title>Gremia.SBV wird gestartet</title>
${startupSplashStyles}
</head>
<body>
  <main aria-labelledby="startup-title">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">SBV</div>
      <div>
        <div class="eyebrow">Gremia.SBV · LOCAL</div>
        <h1 id="startup-title">Gremia.SBV wird gestartet</h1>
      </div>
    </div>

    <section class="status-box" aria-labelledby="startup-status-label">
      <div class="eyebrow">Startstatus</div>
      <h2 id="startup-status-label" role="status" aria-live="polite">${escapeHtml(phase.label)}</h2>
      <p id="startup-status-description">${escapeHtml(phase.description)}</p>
    </section>

    <div class="progress-row" aria-label="Startfortschritt">
      <progress id="startup-progress" max="100" value="${progress}">${progress} %</progress>
      <span id="startup-progress-text" class="progress-meta">${progress} %</span>
    </div>

    <ol aria-label="Startphasen">${steps}</ol>

    <p class="hint">Bitte warten. Der erste Demo-Start kann einen Moment dauern. Die Anwendung läuft bereits; ein erneuter Start bringt dieses Fenster nur in den Vordergrund.</p>
  </main>
</body>
</html>`;
}
