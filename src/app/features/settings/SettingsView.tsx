import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { IndustrialPanel } from '../../shared/components/WorkbenchLayout';
import type { CaseRecord } from '../../core/models/case.model';
import type { ThemeMode } from '../../shared/theme/appTheme';

import { ThemeSettingsForm } from './ThemeSettingsForm';
import { TemplateDefaultSettingsForm } from './TemplateDefaultSettingsForm';
import { TemporaryFilesSettingsPanel } from './TemporaryFilesSettingsPanel';
import { ChangePasswordForm } from './ChangePasswordForm';
import { BackupRestoreForm } from './BackupRestoreForm';
import { RetentionSettingsPanel } from './RetentionSettingsPanel';
import type { SettingsSectionId } from './settingsNavigation';

function SettingsSectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <IndustrialPanel kicker="Einstellungen" title={title} description={description} className="settings-section-intro">
      <div className="industrial-message industrial-message-info">
        Änderungen in diesem Bereich gelten nur lokal für diese Gremia.SBV-Installation.
      </div>
    </IndustrialPanel>
  );
}

export function SettingsView({
  theme,
  onThemeChange,
  cases,
  section = 'settings-general',
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  cases: CaseRecord[];
  section?: SettingsSectionId;
}) {
  return (
    <div className="settings-section-workbench">
      <ModuleFeedback items={[]} />

      {section === 'settings-general' && (
        <>
          <SettingsSectionIntro title="Allgemein" description="Darstellung und lokale Arbeitsumgebung ohne Sicherheitsfolgen einstellen." />
          <div className="grid gap-6 xl:grid-cols-2">
            <ThemeSettingsForm theme={theme} onThemeChange={onThemeChange} />
          </div>
        </>
      )}

      {section === 'settings-security' && (
        <>
          <SettingsSectionIntro title="Sicherheit" description="Passwort und verschlüsselte Sicherungen sind kritische Aktionen und werden bewusst getrennt geführt." />
          <div className="grid gap-6 xl:grid-cols-2">
            <ChangePasswordForm />
            <BackupRestoreForm />
          </div>
        </>
      )}

      {section === 'settings-data-protection' && (
        <>
          <SettingsSectionIntro title="Datenschutz & Löschung" description="Temporäre Dateien, Prüffristen und Löschentscheidungen bleiben sichtbar und dokumentiert." />
          <div className="grid gap-6 xl:grid-cols-2">
            <TemporaryFilesSettingsPanel />
            <RetentionSettingsPanel cases={cases} />
          </div>
        </>
      )}

      {section === 'settings-templates' && (
        <>
          <SettingsSectionIntro title="Vorlagen-Standardwerte" description="Standardwerte vereinheitlichen Schreiben, ohne Falldaten unnötig in Vorlagen zu tragen." />
          <div className="grid gap-6 xl:grid-cols-2">
            <TemplateDefaultSettingsForm />
          </div>
        </>
      )}
    </div>
  );
}
