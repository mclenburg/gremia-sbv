import type { DatabaseAdapter } from "./databaseService.js";
export const DEMO_SEED_MARKER_KEY = "demo.seed.version";
export const DEMO_SEED_VERSION = "1.0.0-demo-002";

export function nowIso(): string {
  return new Date().toISOString();
}

export function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function id(prefix: string, index: number): string {
  return `demo-${prefix}-${String(index).padStart(2, "0")}`;
}

export function run(db: DatabaseAdapter, sql: string, ...params: unknown[]): void {
  db.prepare(sql).run(...params);
}

export function json(value: unknown): string {
  return JSON.stringify(value);
}

export const FIRST_NAMES = [
  "Mara",
  "Jonas",
  "Aylin",
  "Henrik",
  "Samira",
  "Tobias",
  "Leonie",
  "Malik",
  "Katharina",
  "Noah",
  "Sofia",
  "Lennart",
  "Mina",
  "Felix",
  "Nora",
  "Oskar",
  "Amira",
  "David",
  "Jule",
  "Ben",
  "Elif",
  "Paul",
  "Romy",
  "Yasin",
  "Lara",
  "Milan",
  "Tilda",
  "Luis",
  "Greta",
  "Anton",
];

export const LAST_NAMES = [
  "Sommer",
  "Neumann",
  "Kaya",
  "Brandt",
  "Schuster",
  "Nguyen",
  "Fischer",
  "Hoffmann",
  "Wagner",
  "Becker",
  "Schneider",
  "Klein",
  "Wolf",
  "Scholz",
  "Krüger",
  "Hartmann",
  "Meier",
  "Koch",
  "Richter",
  "Bauer",
  "Lang",
  "Werner",
  "Schwarz",
  "Lorenz",
  "Zimmer",
  "Krause",
  "Vogel",
  "Engel",
  "Roth",
  "Seidel",
];

export const CONTACT_CATEGORIES = [
  "inklusionsamt",
  "agentur_fuer_arbeit",
  "betriebsarzt",
  "reha",
  "anwalt",
  "arbeitgeber",
  "betriebsrat",
  "beratung",
  "intern",
  "sonstiges",
];

export const CASE_CATEGORIES = [
  "bem",
  "praevention",
  "kuendigung",
  "gleichstellung",
  "gdb",
  "nachteilsausgleich",
  "diskriminierung",
  "arbeitsplatzgestaltung",
  "teilzeit",
  "sonstiges",
];

export const CASE_MEASURE_TYPES = [
  "prevention",
  "bem",
  "termination_hearing",
  "equalization_gdb",
  "sbv_participation",
  "workplace_accommodation",
];

export const CASE_MEASURE_NOTE_TYPES: Record<string, string> = {
  equalization_gdb: "equalization",
  sbv_participation: "participation",
};

export function noteMeasureTypeFor(type: string): string {
  return CASE_MEASURE_NOTE_TYPES[type] ?? type;
}
