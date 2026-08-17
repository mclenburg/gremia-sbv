export type TemplateDefaultKey =
  | "sbv.name"
  | "sbv.funktion"
  | "sbv.email"
  | "sbv.telefon"
  | "sbv.signatur"
  | "arbeitgeber.ansprechpartner"
  | "arbeitgeber.personalabteilung"
  | "arbeitgeber.name"
  | "unternehmen.name"
  | "standort.name";

export type TemplateDefaultValues = Record<TemplateDefaultKey, string>;

export const TEMPLATE_DEFAULT_FIELDS: Array<{
  key: TemplateDefaultKey;
  label: string;
  description: string;
  multiline?: boolean;
}> = [
  {
    key: "sbv.name",
    label: "{{sbv.name}}",
    description: "Name oder Funktionsbezeichnung der SBV.",
  },
  {
    key: "sbv.funktion",
    label: "{{sbv.funktion}}",
    description: "Funktion, z. B. Schwerbehindertenvertretung.",
  },
  {
    key: "sbv.email",
    label: "{{sbv.email}}",
    description: "Kontakt-E-Mail der SBV.",
  },
  {
    key: "sbv.telefon",
    label: "{{sbv.telefon}}",
    description: "Telefon oder interne Durchwahl.",
  },
  {
    key: "sbv.signatur",
    label: "{{sbv.signatur}}",
    description: "Standard-Signatur für Schreiben.",
    multiline: true,
  },
  {
    key: "arbeitgeber.ansprechpartner",
    label: "{{arbeitgeber.ansprechpartner}}",
    description: "Standard-Ansprechstelle, z. B. Personalabteilung.",
  },
  {
    key: "arbeitgeber.personalabteilung",
    label: "{{arbeitgeber.personalabteilung}}",
    description: "Bezeichnung der Personalabteilung.",
  },
  {
    key: "arbeitgeber.name",
    label: "{{arbeitgeber.name}}",
    description: "Name des Arbeitgebers.",
  },
  {
    key: "unternehmen.name",
    label: "{{unternehmen.name}}",
    description: "Unternehmens- oder Dienststellenname.",
  },
  {
    key: "standort.name",
    label: "{{standort.name}}",
    description: "Standard-Standort.",
  },
];

export const EMPTY_TEMPLATE_DEFAULT_VALUES: TemplateDefaultValues = {
  "sbv.name": "Schwerbehindertenvertretung",
  "sbv.funktion": "Schwerbehindertenvertretung",
  "sbv.email": "",
  "sbv.telefon": "",
  "sbv.signatur": "Mit freundlichen Grüßen\nSchwerbehindertenvertretung",
  "arbeitgeber.ansprechpartner": "Personalabteilung",
  "arbeitgeber.personalabteilung": "Personalabteilung",
  "arbeitgeber.name": "",
  "unternehmen.name": "",
  "standort.name": "",
};

export function normalizeTemplateDefaultValues(
  input: Partial<Record<string, unknown>> | null | undefined,
): TemplateDefaultValues {
  const next = { ...EMPTY_TEMPLATE_DEFAULT_VALUES };
  for (const field of TEMPLATE_DEFAULT_FIELDS) {
    const value = input?.[field.key];
    next[field.key] = typeof value === "string" ? value : next[field.key];
  }
  return next;
}
