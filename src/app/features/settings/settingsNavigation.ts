export type SettingsSectionId =
  | 'settings-general'
  | 'settings-security'
  | 'settings-data-protection'
  | 'settings-templates'
  | 'settings-gremia-br';

export type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'settings-general',
    label: 'Allgemein',
    description: 'Oberfläche, Darstellung und lokale Arbeitsumgebung.',
  },
  {
    id: 'settings-security',
    label: 'Sicherheit',
    description: 'Passwort, Backup und Wiederherstellung bewusst steuern.',
  },
  {
    id: 'settings-data-protection',
    label: 'Datenschutz',
    description: 'Temporäre Arbeitskopien, Löschprüfung und Aufbewahrung.',
  },
  {
    id: 'settings-templates',
    label: 'Vorlagen',
    description: 'Standardwerte für Schreiben und Platzhalter vorbereiten.',
  },
  {
    id: 'settings-gremia-br',
    label: 'Gremia.BR',
    description: 'Optionale Lesebrücke, Zugangsdaten, Relevanzfilter und Lesecache.',
  },
];

export function findSettingsSection(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.id === id);
}
