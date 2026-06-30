export type HelpContentBlock =
  { type: "paragraph"; text: string } | { type: "list"; items: string[] };

export type HelpRegistryEntry = {
  id: string;
  title: string;
  kicker?: string;
  summary?: string;
  blocks: HelpContentBlock[];
};

export const HELP_REGISTRY = {
  "recruiting.overview": {
    id: "recruiting.overview",
    kicker: "Stellenbesetzungen",
    title: "Wozu dient diese Arbeitsmaske?",
    summary:
      "Die Ansicht hält Stellenbesetzungsverfahren nach, ohne daraus eine Bewerberakte zu machen.",
    blocks: [
      {
        type: "paragraph",
        text: "Im Vordergrund stehen Unterrichtung, Unterlagenstatus, Vorstellungsgespräch als Beteiligungsereignis und Anhörung der SBV vor Auswahlentscheidung.",
      },
      {
        type: "paragraph",
        text: "Gesprächsinhalte, Diagnosen und Eignungsbewertungen gehören nicht in diese Verfahrensnachhaltung.",
      },
    ],
  },
  "recruiting.deadlineFollowUp": {
    id: "recruiting.deadlineFollowUp",
    kicker: "Nachhaltung",
    title: "Wiedervorlagen aus Stellenbesetzungen",
    summary:
      "Wiedervorlagen werden aus Stellenbesetzungen nur auf ausdrückliche Aktion angelegt.",
    blocks: [
      {
        type: "list",
        items: [
          "Unterlagen nachhalten, wenn Unterrichtung oder Bewertungsgrundlagen fehlen.",
          "Anhörung nachhalten, wenn nach dem Gespräch noch keine SBV-Stellungnahme möglich war.",
          "Arbeitgeberentscheidung beobachten, wenn eine Auswahlentscheidung angekündigt oder bereits erkennbar ist.",
        ],
      },
    ],
  },
  "recruiting.applicantReference": {
    id: "recruiting.applicantReference",
    kicker: "Bewerbungsreferenz",
    title: "Referenz statt Bewerberakte",
    summary:
      "Die Bewerbungsreferenz dient nur dazu, Gesprächsereignisse im Verfahren auseinanderzuhalten.",
    blocks: [
      {
        type: "paragraph",
        text: "Verwende bevorzugt neutrale Angaben wie Bewerbung 1 oder SB-Bewerbung A. Klarnamen sind nicht erforderlich und werden nicht in Journal-Prefills übernommen.",
      },
    ],
  },
  "recruiting.proceduralNote": {
    id: "recruiting.proceduralNote",
    kicker: "Freitext",
    title: "Verfahrensnotizen knapp halten",
    summary: "Freitexte sind nur für knappe Verfahrenshinweise gedacht.",
    blocks: [
      {
        type: "paragraph",
        text: "Geeignet sind Hinweise wie Unterlagen nachgefordert oder Anhörung offen. Nicht geeignet sind Gesprächsinhalte, medizinische Details oder Eignungsbewertungen.",
      },
    ],
  },
  "participationViolations.stageAndType": {
    id: "participationViolations.stageAndType",
    kicker: "Beteiligungsverstoß",
    title: "Stufe und Verstoßart einordnen",
    summary:
      "Stufe und Verstoßart beschreiben die Verfahrenslage, nicht die Person.",
    blocks: [
      {
        type: "list",
        items: [
          "Nachforderung und formale Rüge sind frühe Stufen der Nachhaltung.",
          "Abmahnung, Aussetzung und OWi-Vorbereitung sind scharfe Eskalationen und sollten fachlich abgestimmt werden.",
          "Nicht informiert, verspätet informiert und unvollständig informiert unterscheiden Unterrichtung, Zeitpunkt und Unterlagenlage.",
        ],
      },
    ],
  },
  "participationViolations.tracking": {
    id: "participationViolations.tracking",
    kicker: "Nachverfolgung",
    title: "Übersicht der Beteiligungsverstöße",
    summary:
      "Die Übersicht dient der Kontrolle bereits protokollierter Vorgänge.",
    blocks: [
      {
        type: "paragraph",
        text: "Statusänderungen folgen der zulässigen Transition-Map und erzeugen Verlaufseinträge. Neue Vorgänge sollten aus dem jeweiligen Ausgangsvorgang heraus vorbereitet werden.",
      },
    ],
  },

  "bem.overview": {
    id: "bem.overview",
    kicker: "BEM",
    title: "BEM-Übersicht",
    summary: "Die Übersicht zeigt fallbezogene BEM-Verfahren und öffnet den jeweiligen Vorgang in der Fallakte.",
    blocks: [
      {
        type: "paragraph",
        text: "Neue BEM-Verfahren werden in der Fallakte angelegt, damit der Fallbezug eindeutig bleibt. Die Übersicht dient nur der Nachhaltung und Navigation.",
      },
    ],
  },
  "prevention.overview": {
    id: "prevention.overview",
    kicker: "Prävention",
    title: "Präventionsübersicht",
    summary: "Die Übersicht bündelt fallbezogene Präventionsverfahren und öffnet den jeweiligen Vorgang in der Fallakte.",
    blocks: [
      {
        type: "paragraph",
        text: "Die Bearbeitung bleibt in der Fallakte. Die Übersicht zeigt Status, Fristen und Risiken, damit offene Verfahren nicht untergehen.",
      },
    ],
  },
  "activityJournal.overview": {
    id: "activityJournal.overview",
    kicker: "Tätigkeitsjournal",
    title: "Eigenaufzeichnung der SBV",
    summary: "Das Tätigkeitsjournal ist eine interne SBV-Nachweislinie.",
    blocks: [
      {
        type: "paragraph",
        text: "Es ist keine Arbeitgeber-Zeiterfassung und keine automatische Übermittlung. Einträge werden erst durch bewusste Speicherung übernommen.",
      },
    ],
  },
  "activityJournal.capture": {
    id: "activityJournal.capture",
    kicker: "Schnellerfassung",
    title: "Tätigkeit erfassen",
    summary:
      "Zeitangaben sind optional und dienen der internen SBV-Selbstdokumentation.",
    blocks: [
      {
        type: "paragraph",
        text: "Kurzbefehle können im Textfeld genutzt werden. Gespeichert wird erst mit dem Speichern-Button.",
      },
    ],
  },
  "activityJournal.textCommands": {
    id: "activityJournal.textCommands",
    kicker: "Tätigkeitsjournal",
    title: "Kurzbefehle und Schnellerfassung",
    summary:
      "Kurzbefehle unterstützen die schnelle Erfassung im Journal, ohne die Arbeitsmaske dauerhaft mit Beispielen zu füllen.",
    blocks: [
      {
        type: "list",
        items: [
          "/zeit 45m erfasst eine Dauer ohne genaue Uhrzeit.",
          "/t 09:15-10:05 erfasst eine Zeitspanne.",
          "// 2026-07-15 Rückmeldung nachhalten erzeugt eine Wiedervorlage.",
          "/wv 15.07.2026 ist eine alternative Datumsschreibweise für Wiedervorlagen.",
        ],
      },
    ],
  },
  "recruiting.procedureData": {
    id: "recruiting.procedureData",
    kicker: "Stellenbesetzungen",
    title: "Verfahrensdaten statt Bewerberakte",
    summary:
      "Das Modul hält die SBV-Beteiligung im Stellenbesetzungsverfahren nach. Es ersetzt keine Bewerberakte und kein Gesprächsprotokoll.",
    blocks: [
      {
        type: "paragraph",
        text: "Erfasst werden Stelle, Kennziffer, Unterrichtung, Unterlagenstatus und Anhörung vor Auswahlentscheidung. Personenbezogene Bewerberdetails bleiben grundsätzlich außerhalb des Vorgangs.",
      },
      {
        type: "paragraph",
        text: "Vorstellungsgespräche werden als Beteiligungsereignisse geführt. Entscheidend ist, ob die SBV eingeladen wurde, teilgenommen hat und ob nach dem Gespräch eine Anhörung vor Entscheidung offen ist.",
      },
    ],
  },
  "recruiting.interviewEvent": {
    id: "recruiting.interviewEvent",
    kicker: "Vorstellungsgespräch",
    title: "Beteiligungsereignis dokumentieren",
    summary:
      "Das Gespräch wird als Verfahrensereignis dokumentiert. Inhaltliche Gesprächsnotizen, Diagnosen oder Eignungsbewertungen gehören nicht in diesen Abschnitt.",
    blocks: [
      {
        type: "list",
        items: [
          "Bewerbungsreferenzen können anonym oder pseudonym geführt werden.",
          "Barrierefreiheit wird als Verfahrensstatus erfasst, nicht als medizinisches Detail.",
          "Nachhaltung erfolgt über Wiedervorlagen oder eine bewusste Verstoßprüfung.",
        ],
      },
    ],
  },
  "participationViolations.sourceContext": {
    id: "participationViolations.sourceContext",
    kicker: "Beteiligungsverstoß",
    title: "Ausgangskontext des Verstoßes",
    summary:
      "Ein Beteiligungsverstoß sollte aus einem nachvollziehbaren Vorgang heraus geprüft werden.",
    blocks: [
      {
        type: "paragraph",
        text: "Der Kontext zeigt, aus welchem Beteiligungsvorgang die Prüfung stammt. Das kann eine SBV-Beteiligungsmaßnahme oder eine Stellenbesetzung sein.",
      },
      {
        type: "paragraph",
        text: "Der Verstoß wird nicht automatisch an den Arbeitgeber gesendet. Schreiben und Eskalationsschritte bleiben bewusste Entscheidungen der SBV.",
      },
    ],
  },
} as const satisfies Record<string, HelpRegistryEntry>;

export type HelpRegistryId = keyof typeof HELP_REGISTRY;

export function getHelpEntry(id: HelpRegistryId): HelpRegistryEntry {
  return HELP_REGISTRY[id];
}
