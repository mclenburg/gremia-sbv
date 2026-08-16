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
  "elections.setup": {
    id: "elections.setup", kicker: "Wahl", title: "Wahleinleitung",
    summary: "Wahlgrund, Mindestschwelle und Verfahrensvorschlag werden dokumentiert; die Entscheidung bleibt beim zuständigen Wahlorgan.",
    blocks: [{ type: "paragraph", text: "Offene Gleichstellungsanträge zählen nicht zur Mindestschwelle. Verfahrenshinweise sind Prüfhilfen und keine automatische Rechtsentscheidung." }],
  },
  "elections.body": {
    id: "elections.body", kicker: "Wahlorgan", title: "Wahlvorstand oder Wahlleitung",
    summary: "Das Wahlorgan wird passend zum bestätigten Verfahren dokumentiert.",
    blocks: [{ type: "paragraph", text: "Förmliches und vereinfachtes Verfahren sowie die Nachwahl einer Stellvertretung bleiben als getrennte Verfahrenspfade nachvollziehbar." }],
  },
  "elections.voters": {
    id: "elections.voters", kicker: "Wählerliste", title: "Wählerlisten-Snapshot und Einsprüche",
    summary: "Die Anwendung hält einen nachvollziehbaren Snapshot der Wahlberechtigten und Einwände dagegen fest.",
    blocks: [{ type: "paragraph", text: "Gespeichert wird die für die Wahl erforderliche Einordnung; offene Gleichstellungsanträge werden nicht als bestätigte Wahlberechtigung behandelt." }],
  },
  "elections.nominations": {
    id: "elections.nominations", kicker: "Wahlvorschläge", title: "Kandidaturen und Wahlvorschläge",
    summary: "Kandidaturen, Unterstützungen und Korrektur-/Nachfristen werden als Verfahrensstand geführt.",
    blocks: [{ type: "paragraph", text: "Wählbarkeitsprüfungen sind fachliche Prüfhilfen. Die endgültige Entscheidung trifft das Wahlorgan." }],
  },
  "elections.documents": {
    id: "elections.documents", kicker: "Dokumente", title: "Vorbereitende Wahlunterlagen",
    summary: "Wahlausschreiben und weitere vorbereitende Unterlagen werden als menschenlesbare PDFs erzeugt und verschlüsselt abgelegt.",
    blocks: [{ type: "paragraph", text: "Rechtsregel- und Vorlagenversion bleiben am Dokument nachvollziehbar. Ein erzeugtes Dokument startet keine Frist, sofern dafür ein gesondertes Ereignis erforderlich ist." }],
  },
  "elections.ballots": {
    id: "elections.ballots", kicker: "Stimmabgabe", title: "Stimmzettel und Wahltag",
    summary: "Die Wahlgänge für Vertrauensperson und Stellvertretung bleiben strikt getrennt.",
    blocks: [{ type: "paragraph", text: "Gremia.SBV erzeugt Unterlagen und dokumentiert Checkpunkte, speichert aber niemals eine individuelle Stimmentscheidung." }],
  },
  "elections.mail": {
    id: "elections.mail", kicker: "Briefwahl", title: "Briefwahlstatus",
    summary: "Erfasst werden Ausgabe, Eingang, Erklärung, Übergabe an die Urne und die Behandlung verspäteter Wahlbriefe.",
    blocks: [{ type: "paragraph", text: "Der Inhalt eines Stimmzettels gehört nicht in die Anwendung. Verspätete Wahlbriefe werden nur als Verfahrensstatus nachgehalten." }],
  },
  "elections.counting": {
    id: "elections.counting", kicker: "Auszählung", title: "Aggregierte Stimmen und Losentscheid",
    summary: "Gespeichert werden ausschließlich aggregierte Stimmenzahlen.",
    blocks: [{ type: "paragraph", text: "Bei entscheidender Stimmengleichheit dokumentiert die Anwendung nur den real durchgeführten Losentscheid; sie trifft keinen Zufallsentscheid selbst." }],
  },
  "elections.acceptance": {
    id: "elections.acceptance", kicker: "Ergebnis", title: "Benachrichtigung, Annahme und Nachrücken",
    summary: "Benachrichtigung und Reaktion gewählter Personen werden nachvollziehbar geführt.",
    blocks: [{ type: "paragraph", text: "Ablehnung oder Fristablauf werden dokumentiert; bei Bedarf wird der nächste Rang als Nachrückfall vorbereitet." }],
  },
  "elections.archive": {
    id: "elections.archive", kicker: "Wahlakte", title: "Abschluss, Aufbewahrung und Transfer",
    summary: "Bekanntmachung, Mitteilungen, physische Originale, PDF-Wahlakte, Legal Hold und geschützter Instanztransfer werden zusammengeführt.",
    blocks: [{ type: "paragraph", text: "Digitale Exporte ersetzen physische Originale nicht. Importierte Wahlakten erhalten lokale IDs; fremde Auditketten werden nicht in die lokale HashChain übernommen." }],
  },
  "sbvOffice.meetings": {
    id: "sbvOffice.meetings", kicker: "Gremien", title: "SBV-Sicht auf Sitzungen",
    summary: "Dokumentiert werden Teilnahme, SBV-relevante Tagesordnungspunkte, eigene Position und gegebenenfalls die Aussetzung nach § 178 Abs. 4 SGB IX.",
    blocks: [{ type: "paragraph", text: "Die Aufzeichnung ist eine SBV-Eigenaufzeichnung und kein Betriebsratsprotokoll. Bei erheblicher Beeinträchtigung wichtiger Interessen oder fehlender Beteiligung kann eine Aussetzung dokumentiert werden; die Wochenfrist wird zentral nachgehalten. Ist die Gremia.BR-Lesebrücke aktiviert, können Sitzung und Tagesordnung als eigene SBV-Arbeitskopie übernommen werden. SBV-Relevanz, Positionen und Bewertungen werden nicht automatisch gesetzt." }],
  },
  "sbvOffice.assembly": {
    id: "sbvOffice.assembly", kicker: "Versammlung", title: "Schwerbehindertenversammlung",
    summary: "Der Jahresworkflow unterstützt Planung, Einladung, Barrierefreiheitscheck, Arbeitgeberbericht, Protokoll und Folgeaufgaben.",
    blocks: [{ type: "paragraph", text: "Der Arbeitgeberbericht nach § 166 Abs. 4 SGB IX wird als eigener Status geführt. Ein Entwurf darf unvollständig sein; der Status bereit setzt Termin und Einladung voraus." }],
  },
  "sbvOffice.obligations": {
    id: "sbvOffice.obligations", kicker: "Überwachung", title: "Arbeitgeberpflichten prüfen",
    summary: "Wiederkehrende Pflichten werden als getrennte Prüfvorgänge je Zeitraum geführt und nicht nur als statische Merkliste angezeigt.",
    blocks: [{ type: "paragraph", text: "Die Anwendung dokumentiert Anforderung, Eingang, Prüfung, Feststellung und Folgeaktion. Sie trifft keine automatische Rechtsbewertung eines Arbeitgeberverstoßes." }],
  },
  "sbvOffice.inclusionAgreement": {
    id: "sbvOffice.inclusionAgreement", kicker: "§ 166 SGB IX", title: "Inklusionsvereinbarung verhandeln und evaluieren",
    summary: "Die Verhandlungsakte bildet Initiative, Themenmatrix, Verhandlung, Abschluss, Übermittlung und Review ab.",
    blocks: [{ type: "paragraph", text: "Alle gesetzlichen Themenfelder werden sichtbar geführt. Nicht bearbeitete Felder werden nicht automatisch als Rechtsverstoß bewertet. Nach Abschluss werden die Übermittlungen an Agentur für Arbeit und Integrationsamt nachgehalten." }],
  },
  "sbvOffice.complaints": {
    id: "sbvOffice.complaints", kicker: "Fallakte", title: "Anregungen und Beschwerden",
    summary: "Beschwerden werden in der bestehenden Fallakte geprüft, mit dem Arbeitgeber nachgehalten und mit einer Rückmeldung zu Stand und Ergebnis abgeschlossen.",
    blocks: [{ type: "paragraph", text: "Schnellfall-Vorlagen legen auf Wunsch eine Checkliste als Fallnotiz an. Sie unterstützen die Bearbeitung, treffen aber keine automatische Rechtsentscheidung." }],
  },
} as const satisfies Record<string, HelpRegistryEntry>;

export type HelpRegistryId = keyof typeof HELP_REGISTRY;

export function getHelpEntry(id: HelpRegistryId): HelpRegistryEntry {
  return HELP_REGISTRY[id];
}
