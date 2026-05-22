export type SettingsSection = {
  id: string;
  label: string;
  description: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'settings-general',
    label: 'Allgemein',
    description: 'Oberfläche, Darstellung, Sicherung und vorhandene Grundeinstellungen.',
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
