import { useMemo, useState } from 'react';
import type { CaseRecord } from '../../core/models/case.model';
import { SettingsView, type ThemeMode } from '../../workflowViews';
import { GremiaBrSettingsPanel } from './GremiaBrSettingsPanel';
import { SETTINGS_SECTIONS } from './settingsNavigation';

export function SettingsHub({
  theme,
  onThemeChange,
  cases,
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  cases: CaseRecord[];
}) {
  const [activeSectionId, setActiveSectionId] = useState(SETTINGS_SECTIONS[0]?.id ?? 'settings-general');
  const activeSection = useMemo(
    () => SETTINGS_SECTIONS.find((section) => section.id === activeSectionId) ?? SETTINGS_SECTIONS[0],
    [activeSectionId],
  );

  return (
    <section className="settings-hub industrial-card" aria-labelledby="settings-hub-title">
      <div className="industrial-card-header settings-hub-header">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Einstellungen</p>
          <h3 id="settings-hub-title">Konfiguration</h3>
        </div>
      </div>

      <div className="settings-hub-tabs" role="tablist" aria-label="Einstellungsbereiche">
        {SETTINGS_SECTIONS.map((section) => (
          <button
            key={section.id}
            id={`${section.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeSectionId === section.id}
            aria-controls={`${section.id}-panel`}
            className="settings-hub-tab"
            onClick={() => setActiveSectionId(section.id)}
          >
            <strong>{section.label}</strong>
            <span>{section.description}</span>
          </button>
        ))}
      </div>

      <div
        id={`${activeSection.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeSection.id}-tab`}
        className="settings-hub-panel"
      >
        {activeSection.id === 'settings-general' && <SettingsView theme={theme} onThemeChange={onThemeChange} cases={cases} />}
        {activeSection.id === 'settings-gremia-br' && <GremiaBrSettingsPanel />}
      </div>
    </section>
  );
}
