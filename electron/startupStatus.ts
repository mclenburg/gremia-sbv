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
  <title>Gremia.SBV wird gestartet</title>
  <style>
    :root {
      color-scheme: dark;
      --splash-bg: #050505;
      --splash-grid-a: rgba(250, 204, 21, 0.045);
      --splash-grid-b: rgba(250, 204, 21, 0.03);
      --splash-panel: #0b0b0d;
      --splash-panel-muted: #111113;
      --splash-text: #f4f4f5;
      --splash-muted: #a1a1aa;
      --splash-border: #3f3f46;
      --splash-accent: #facc15;
      --splash-accent-strong: #ffe45c;
      --splash-shadow: rgba(0, 0, 0, 0.38);
    }

    html[data-theme="light"] {
      color-scheme: light;
      --splash-bg: #f4f4ef;
      --splash-grid-a: rgba(184, 135, 0, 0.14);
      --splash-grid-b: rgba(184, 135, 0, 0.10);
      --splash-panel: #fbfaf2;
      --splash-panel-muted: #ece8d8;
      --splash-text: #141414;
      --splash-muted: #4f4a3d;
      --splash-border: #77715f;
      --splash-accent: #b88700;
      --splash-accent-strong: #7a5a00;
      --splash-shadow: rgba(20, 20, 20, 0.16);
    }

    * { box-sizing: border-box; }

    html,
    body {
      height: 100%;
      overflow: hidden;
    }

    body {
      align-items: stretch;
      background:
        linear-gradient(var(--splash-grid-a) 1px, transparent 1px),
        linear-gradient(90deg, var(--splash-grid-b) 1px, transparent 1px),
        var(--splash-bg);
      background-size: 24px 24px;
      color: var(--splash-text);
      display: flex;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      justify-content: center;
      margin: 0;
      padding: 18px;
    }

    main {
      align-self: center;
      background: linear-gradient(135deg, var(--splash-panel), var(--splash-panel-muted));
      border: 1px solid var(--splash-border);
      box-shadow: 0 18px 52px var(--splash-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      display: grid;
      gap: 16px;
      max-height: calc(100vh - 36px);
      max-width: 720px;
      padding: 20px 22px;
      width: min(100%, 720px);
    }

    .brand { align-items: center; display: flex; gap: 14px; min-width: 0; }
    .brand-mark { border: 2px solid var(--splash-accent); color: var(--splash-accent); display: grid; font-size: 16px; font-weight: 950; height: 46px; letter-spacing: -0.08em; place-items: center; width: 46px; }
    .eyebrow,
    .progress-meta { color: var(--splash-muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; font-weight: 850; letter-spacing: 0.2em; text-transform: uppercase; }
    h1 { font-size: clamp(24px, 4.2vw, 34px); letter-spacing: -0.06em; line-height: 1; margin: 4px 0 0; }
    h2 { font-size: 19px; letter-spacing: -0.03em; margin: 0 0 4px; }
    p { color: var(--splash-muted); font-size: 14px; line-height: 1.45; margin: 0; }

    .status-box { border-left: 4px solid var(--splash-accent); padding-left: 16px; }
    .progress-row { align-items: center; display: grid; gap: 12px; grid-template-columns: 1fr 48px; }
    progress { accent-color: var(--splash-accent); background: var(--splash-bg); border: 1px solid var(--splash-border); height: 12px; width: 100%; }
    progress::-webkit-progress-bar { background: var(--splash-bg); }
    progress::-webkit-progress-value { background: var(--splash-accent); }
    progress::-moz-progress-bar { background: var(--splash-accent); }

    ol {
      border-top: 1px solid var(--splash-border);
      display: grid;
      gap: 8px 18px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      list-style: none;
      margin: 0;
      padding: 14px 0 0;
    }
    li { color: var(--splash-muted); font-size: 12px; line-height: 1.25; min-width: 0; padding-left: 16px; position: relative; }
    li::before { background: var(--splash-border); content: ""; height: 7px; left: 0; position: absolute; top: 0.34em; width: 7px; }
    li[data-active="true"] { color: var(--splash-text); font-weight: 850; }
    li[data-active="true"]::before { background: var(--splash-accent); }

    .hint { border: 1px solid var(--splash-border); color: var(--splash-muted); font-size: 12px; line-height: 1.45; padding: 10px 12px; }

    @media (max-width: 560px), (max-height: 420px) {
      body { padding: 12px; }
      main { gap: 12px; max-height: calc(100vh - 24px); padding: 16px; }
      .brand-mark { height: 40px; width: 40px; }
      h1 { font-size: 24px; }
      h2 { font-size: 17px; }
      p { font-size: 13px; }
      ol { gap: 6px 12px; }
      li { font-size: 11px; }
      .hint { font-size: 11px; padding: 8px 10px; }
    }

    @media (prefers-reduced-motion: no-preference) {
      .brand-mark { animation: pulse 1.8s ease-in-out infinite; }
      @keyframes pulse { 0%, 100% { box-shadow: inset 0 0 0 rgba(250, 204, 21, 0); } 50% { box-shadow: inset 0 0 18px rgba(250, 204, 21, 0.2); } }
    }
  </style>
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
