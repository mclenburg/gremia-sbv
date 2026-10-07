import { Moon, Sun } from "lucide-react";
import type { ThemeMode } from "../../shared/theme/appTheme";

export function ThemeSettingsForm({
  theme,
  onThemeChange,
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}) {
  return (
    <section className="industrial-settings-form">
      <div>
        <h3>Darstellung</h3>
        <p className="industrial-settings-note">
          Industrial bleibt die Designsprache. Der Light-Mode hellt nur die
          Arbeitsfläche auf, ohne daraus ein freundliches Wellness-Layout zu
          machen.
        </p>
      </div>

      <div
        className="industrial-theme-switch"
        role="group"
        aria-label="Darstellung auswählen"
      >
        <button
          type="button"
          className={theme === "dark" ? "active" : ""}
          onClick={() => onThemeChange("dark")}
        >
          <Moon className="industrial-icon" />
          Dark Industrial
        </button>
        <button
          type="button"
          className={theme === "light" ? "active" : ""}
          onClick={() => onThemeChange("light")}
        >
          <Sun className="industrial-icon" />
          Light Industrial
        </button>
      </div>
    </section>
  );
}
