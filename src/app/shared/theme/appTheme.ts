export type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "gremia.sbv.theme";

export function nowLabel(): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function persistTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Darstellung bleibt für die Sitzung aktiv, auch wenn Persistenz nicht möglich ist.
  }
}

export function getInitialTheme(): ThemeMode {
  return readStoredTheme() ?? "dark";
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme;
  persistTheme(theme);
}
