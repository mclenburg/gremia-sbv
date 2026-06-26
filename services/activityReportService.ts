export interface ActivityReportInput {
  periodLabel: string;
  generatedAt?: string;
  cases: unknown[];
  deadlines: unknown[];
  contacts: unknown[];
  preventionProcesses: unknown[];
  bemProcesses: unknown[];
  equalizationProcesses: unknown[];
  terminationProcesses: unknown[];
  activityJournalEntries?: unknown[];
  participationViolations?: unknown[];
}

export interface ActivityReportResult {
  title: string;
  filename: string;
  body: string;
  generatedAt: string;
}

function countBy<T extends Record<string, unknown>>(
  rows: unknown[],
  key: string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows as T[]) {
    const value = String(row?.[key] ?? "unbekannt");
    result[value] = (result[value] ?? 0) + 1;
  }
  return result;
}

function numberValue(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function sumBy(rows: unknown[], key: string): number {
  return rows.reduce<number>(
    (sum, row) => sum + numberValue((row as Record<string, unknown>)?.[key]),
    0,
  );
}

function countBoolean(rows: unknown[], key: string): number {
  return rows.filter((row) =>
    booleanValue((row as Record<string, unknown>)?.[key]),
  ).length;
}

function tableFromJournalCategories(rows: unknown[]): string {
  const grouped = new Map<string, { count: number; minutes: number }>();
  for (const row of rows as Record<string, unknown>[]) {
    const category = String(row?.category ?? "unbekannt");
    const current = grouped.get(category) ?? { count: 0, minutes: 0 };
    current.count += 1;
    current.minutes += numberValue(
      row?.durationMinutes ?? row?.duration_minutes,
    );
    grouped.set(category, current);
  }
  const entries = [...grouped.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "de"),
  );
  if (!entries.length)
    return "## Tätigkeitsjournal nach Kategorie\n\nKeine Daten im Auswertungszeitraum.\n";
  return `## Tätigkeitsjournal nach Kategorie\n\n| Kategorie | Einträge | Minuten |\n|---|---:|---:|\n${entries.map(([label, value]) => `| ${label} | ${value.count} | ${value.minutes} |`).join("\n")}\n`;
}

function tableFromCounts(
  title: string,
  counts: Record<string, number>,
): string {
  const rows = Object.entries(counts).sort(([a], [b]) =>
    a.localeCompare(b, "de"),
  );
  if (!rows.length)
    return `## ${title}\n\nKeine Daten im Auswertungszeitraum.\n`;
  return `## ${title}\n\n| Kategorie | Anzahl |\n|---|---:|\n${rows.map(([label, value]) => `| ${label} | ${value} |`).join("\n")}\n`;
}

function totalOpenDeadlines(rows: unknown[]): number {
  return rows.filter(
    (row: any) =>
      row?.status === "open" ||
      row?.status === "overdue" ||
      row?.status === undefined,
  ).length;
}

function overdueDeadlines(rows: unknown[]): number {
  return rows.filter(
    (row: any) =>
      row?.status === "overdue" ||
      (row?.dueAt &&
        new Date(row.dueAt).getTime() < Date.now() &&
        row?.status !== "done"),
  ).length;
}

export function renderActivityReport(
  input: ActivityReportInput,
): ActivityReportResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const title = `SBV-Tätigkeitsbericht – ${input.periodLabel}`;

  const caseCategories = countBy(input.cases, "category");
  const preventionStatus = countBy(input.preventionProcesses, "status");
  const bemStatus = countBy(input.bemProcesses, "status");
  const equalizationStatus = countBy(
    input.equalizationProcesses,
    "applicationStatus",
  );
  const terminationStatus = countBy(input.terminationProcesses, "status");
  const journalEntries = input.activityJournalEntries ?? [];
  const participationViolations = input.participationViolations ?? [];
  const journalStatus = countBy(journalEntries, "status");
  const participationViolationStatus = countBy(
    participationViolations,
    "status",
  );
  const participationViolationStage = countBy(participationViolations, "stage");
  const journalMinutes =
    sumBy(journalEntries, "durationMinutes") ||
    sumBy(journalEntries, "duration_minutes");
  const journalOutsideCount =
    countBoolean(journalEntries, "performedOutsideContractWorkTime") ||
    countBoolean(journalEntries, "performed_outside_contract_work_time");

  const body = `# ${title}

Erzeugt am: ${new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(generatedAt))}

## Datenschutzgrundsatz

Dieser Tätigkeitsbericht ist anonymisiert und enthält bewusst keine Namen, Aktenzeichen, Freitexte, Diagnosen, Arbeitgebervorträge, Gesprächsnotizen oder Stellungnahmen. Er dient der zusammenfassenden Darstellung der SBV-Arbeit.

## Gesamtübersicht

| Kennzahl | Anzahl |
|---|---:|
| Fallakten | ${input.cases.length} |
| Kontakte | ${input.contacts.length} |
| offene / relevante Fristen | ${totalOpenDeadlines(input.deadlines)} |
| davon überfällig | ${overdueDeadlines(input.deadlines)} |
| Präventionsverfahren | ${input.preventionProcesses.length} |
| BEM-Verfahren | ${input.bemProcesses.length} |
| Gleichstellung-/GdB-Verfahren | ${input.equalizationProcesses.length} |
| Kündigungsanhörungen | ${input.terminationProcesses.length} |
| Tätigkeitsjournal-Einträge | ${journalEntries.length} |
| dokumentierte SBV-Zeit (Min.) | ${journalMinutes} |
| davon außerhalb Regelarbeitszeit (Einträge) | ${journalOutsideCount} |
| Beteiligungsverstöße | ${participationViolations.length} |

${tableFromCounts("Fallakten nach Kategorie", caseCategories)}

${tableFromCounts("Prävention nach Status", preventionStatus)}

${tableFromCounts("BEM nach Status", bemStatus)}

${tableFromCounts("Gleichstellung / GdB nach Status", equalizationStatus)}

${tableFromCounts("Kündigungsanhörungen nach Status", terminationStatus)}

${tableFromJournalCategories(journalEntries)}

${tableFromCounts("Tätigkeitsjournal nach Status", journalStatus)}

${tableFromCounts("Beteiligungsverstöße nach Status", participationViolationStatus)}

${tableFromCounts("Beteiligungsverstöße nach Eskalationsstufe", participationViolationStage)}

## Inhaltliche Schwerpunkte

- Beratung und Unterstützung schwerbehinderter und gleichgestellter Beschäftigter.
- Begleitung von Prävention, BEM, Gleichstellung/GdB und Kündigungsanhörungen.
- Fristenkontrolle und Dokumentation von Beteiligungsvorgängen.
- Eigenaufzeichnung der SBV-Tätigkeit einschließlich Zeitaufwänden und Eskalationsnachweisen.
- Zusammenarbeit mit internen und externen Stellen, soweit für die SBV-Aufgabe erforderlich.

## Grenzen der Auswertung

Die Auswertung ist bewusst zahlen- und statusorientiert. Sensible Freitexte werden nicht aufgenommen. Einzelfälle können aus diesem Bericht nicht rekonstruiert werden.

## Prüfpunkte vor Weitergabe

- ☐ Bericht enthält keine Namen.
- ☐ Bericht enthält keine Aktenzeichen.
- ☐ Bericht enthält keine Diagnosen oder Gesundheitsdetails.
- ☐ Bericht enthält keine Arbeitgebervorträge oder SBV-Stellungnahmen.
- ☐ Bericht enthält keine kleinen Gruppen, die intern leicht re-identifizierbar wären.
- ☐ Zweck und Empfängerkreis der Weitergabe sind dokumentiert.
`;

  return {
    title,
    filename: `gremia-sbv-taetigkeitsbericht-${generatedAt.slice(0, 10)}.md`,
    body,
    generatedAt,
  };
}

export function assertActivityReportHasNoSensitiveFreeText(
  body: string,
): boolean {
  const forbidden = [
    /Aktenzeichen:\s*\S+/i,
    /(^|\n)\s*Diagnose\s*:/i,
    /Arbeitgebervortrag:/i,
    /SBV-Stellungnahme:/i,
    /Gesprächsnotiz:/i,
    /Name:\s*\S+/i,
  ];
  return !forbidden.some((pattern) => pattern.test(body));
}
