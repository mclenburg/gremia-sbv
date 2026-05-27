# Prozessmodule und Maßnahmenlogik

## Grundsatz

Prozessmodule schreiben die Fallakte fort. Sie ersetzen keine rechtliche Bewertung und keine menschliche Entscheidung der SBV.

Die Module sollen SBV-Arbeit strukturieren: Was ist der Anlass? Welche Beteiligungsrechte sind betroffen? Welche Fristen laufen? Welche Maßnahmen wurden vereinbart? Was muss nachgehalten werden?

## Module

- BEM,
- Prävention,
- Beteiligung,
- Kündigung,
- Gleichstellung / GdB-Beratung,
- Arbeitsplatzgestaltung,
- Fristen und Wiedervorlagen,
- Personenverzeichnis und Schutzstatus,
- Fallübergabe / Vertretung.

## Personenbezug

Reguläre Prozessmaßnahmen gehören über die Fallakte zu genau einer Person. Bei anonymer Anfrage ist nur ein pseudonymer Personenstamm zulässig. Maßnahmen dürfen keinen parallelen Personenbezug speichern, wenn der Bezug über `CaseFile → ProtectedPerson` ableitbar ist.

## Maßnahmen

Maßnahmen sind konkrete Arbeitsschritte oder Vereinbarungen innerhalb einer Fallakte. Sie können aus Prozessmodulen entstehen oder manuell dokumentiert werden. Sie sind relevant für Fristen, Berichte, Art.-15-Auskunft, Fallübergabe und Datenschutzprüfung.

## Speicherung großer Textfelder

Große Textfelder und Textareas in Maßnahmen speichern auf Lost Focus. Inline-Kommandos bleiben aktiv und nutzen die bestehende Kommandoerkennung.

Freitexte gelten als prüfpflichtig, weil sie häufig sensible Daten enthalten. Sie werden nicht automatisch anonymisiert oder geschwärzt.

## Fallübergabe

Fallbezogene Maßnahmen können Bestandteil eines verschlüsselten Übergabepakets sein. Beim Import werden sie lokal neu erzeugt oder nach bewusster Entscheidung mit einem vorhandenen Gegenstück zusammengeführt beziehungsweise aktualisiert. Nach Ablauf der Vertretungszeit sind weitere Bearbeitungen begründungspflichtig.

## Datenschutz-Lifecycle

Statusablauf, Beschäftigungsende, Anonymisierung oder Löschung der Person markieren verbundene Maßnahmen zur Datenschutzprüfung. Freitexte werden nicht automatisch anonymisiert. Maßnahmennotizen sind als eigene fall- und maßnahmengebundene Freitexte Teil dieses Prüfpfads.
