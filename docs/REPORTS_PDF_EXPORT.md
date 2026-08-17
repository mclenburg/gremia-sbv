# Reports und PDF-Export

## Ziel

Berichte sollen SBV-Arbeit nachvollziehbar machen, ohne unnötige personenbezogene oder technische Daten offenzulegen.

## Datenschutz

- Keine technischen UUIDs in nutzerorientierten Berichten, soweit vermeidbar.
- Keine Diagnosen in Standardberichten.
- Personenbezogene Exporte nur bewusst über ExportGuard.
- Tätigkeitsberichte bevorzugt anonymisiert und aggregiert.

## Personenverzeichnis

Auswertungen aus dem Personenverzeichnis dürfen standardmäßig nur aggregiert erfolgen. GdB wird nicht als Standardfeld ausgewertet, weil der genaue GdB nicht Standardbestandteil des Personenverzeichnisses ist.

## PDF

PDF-Exports sind lokale Exporte und unterliegen denselben Datenschutzregeln wie DOCX-/Dateiexporte.

Alle Berichts- und Wahl-PDFs entstehen direkt im Electron-Main-Prozess mit PDFKit. Es gibt keinen HTML-Zwischenschritt, kein Chromium-Druckfenster und keine unverschlüsselte temporäre HTML-Datei. Die fachlichen Berichtsdienste liefern eine gemeinsame, rendererunabhängige Dokumentstruktur; der PDF-Renderer übernimmt ausschließlich Satz, Seitenumbrüche und PDF-Semantik.

Der Renderer bettet Noto Sans ein und übernimmt fachliche Inhalte Unicode-getreu. Insbesondere Namen, Überschriften und Nachweistexte in Wahlakten dürfen nicht transliteriert oder anderweitig normalisiert werden. Wahlakten werden nach der Erzeugung weiterhin ausschließlich im verschlüsselten Dokumentenspeicher abgelegt.

Erzeugte PDFs enthalten Titel, deutsche Dokumentsprache, logische Lesereihenfolge sowie Strukturkennzeichen für Überschriften, Absätze, Listen und Tabellen. Wiederholte Tabellenköpfe und Fußzeilen sind als solche behandelt; Status- und Warninformationen stehen immer als Text zur Verfügung und werden nicht allein durch Farbe vermittelt.

Die PDF-Funktionstests lesen die erzeugten Binärdokumente mit einem unabhängigen PDF-Parser und prüfen Inhalt, Unicode, Metadaten, Seitenumbrüche und Strukturbaum. Zusätzlich wird ein mehrseitiges Referenzdokument gerendert und visuell auf Überläufe, abgeschnittene Inhalte und unlesbare Tabellen geprüft.

## Einheitlicher Tätigkeitsbericht

Der Tätigkeitsbericht wird ausschließlich über den produktiven PDF-Berichtsdienst erzeugt. Maßnahmenkennzahlen stammen aus strukturierten Lifecycle-Ereignissen der vollständig verifizierten Audit-HashChain. Zwecktexte, Fallkennzeichen, Namen und vertrauliche Freitexte werden nicht ausgewertet.

Die Auswertung trennt:

- Aktivitäten im gewählten Zeitraum,
- aktuelle Stichtagsbestände,
- technische Löschereignisse und
- die Datenabdeckung seit Einführung des Lifecycle-Protokolls.

Gelöschte Fachdaten verändern historische Maßnahmenzähler nicht. Beginnt ein gewählter Zeitraum vor der Einführung des strukturierten Lifecycle-Protokolls, kennzeichnet der Bericht die Maßnahmenauswertung ausdrücklich als teilweise protokolliert. Bei einer beschädigten HashChain wird kein Tätigkeitsbericht erzeugt.
