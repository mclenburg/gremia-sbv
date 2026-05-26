# Lösch- und Anonymisierungskonzept – Gremia.SBV

## 1. Grundsatz

SBV-Fallakten enthalten regelmäßig Gesundheitsdaten und andere hochsensible Beschäftigtendaten. Löschung darf daher nicht nur technisch, sondern muss fachlich und rechtlich geprüft erfolgen.

Automatische Hard Deletes ohne dokumentierte Prüfung sind zu vermeiden.

## 2. Löscharten

| Löschart | Bedeutung |
|---|---|
| Soft Delete | Datensatz wird ausgeblendet, bleibt aber wiederherstellbar |
| Anonymisierung | Personenbezug wird entfernt oder ersetzt |
| Hard Delete | endgültige Löschung aus aktiver Datenbank |
| Backup-Ablauf | Löschung über Backup-Rotation |

## 3. Trigger für Lösch-/Anonymisierungsprüfung

- Schutzstatus abgelaufen,
- Beschäftigung beendet,
- Person wird anonymisiert,
- Person wird gelöscht,
- Fall abgeschlossen,
- Zweckfortfall,
- Export- oder Übergabedatei abgelaufen,
- Altfall ohne Personenbindung.

## 4. Falltypbezogene Vorschlagsfristen

Diese Fristen sind Vorschläge für die App und ersetzen keine rechtliche Prüfung.

| Falltyp | Vorschlagsfrist |
|---|---|
| allgemeine Beratung | Abschluss + 3 Jahre |
| GdB-/Gleichstellungsberatung | Abschluss + 3 Jahre |
| BEM | Abschluss + 3 Jahre |
| Präventionsverfahren | Abschluss + 3 bis 6 Jahre |
| Kündigungsanhörung / Kündigungsschutz | Abschluss + 6 Jahre |
| Arbeitsplatzanpassung | Abschluss + 3 bis 6 Jahre |
| Konflikt / Diskriminierung | Abschluss + 3 bis 6 Jahre |
| Exportdateien | sofortige Prüfung, spätestens 24 bis 90 Tage |
| Audit-Logs | 12 bis 36 Monate, ohne Direktidentifikatoren |
| Backups | rotierend, verschlüsselt, mit Ablaufdatum |

## 5. Löschprüfung

Vor Löschung ist zu prüfen:

- Ist der Fall abgeschlossen?
- Gibt es laufende Verfahren?
- Gibt es arbeitsrechtliche oder sozialrechtliche Risiken?
- Sind Dritte betroffen?
- Ist Anonymisierung ausreichend?
- Sind Dokumente separat zu löschen?
- Sind Backups betroffen?
- Muss ein Löschprotokoll erstellt werden?
- Keine BR-Fristen übernehmen.

## 6. Löschprotokoll

Ein Löschprotokoll soll enthalten:

- Fall-ID oder pseudonymisierte Entitäts-ID,
- Aktenzeichen nur wenn nicht identifizierend,
- Löschart,
- Löschgrund,
- Rechtsgrundlage,
- betroffene Datenarten,
- durchführende Person/Rolle,
- Zeitpunkt,
- Hinweis auf Backup-Rotation,
- Ergebnis der Prüfung.

## 7. Anonymisierung

Anonymisierung ist vorzuziehen, wenn statistische, organisatorische oder Tätigkeitsbericht-Zwecke erhalten bleiben sollen.

Zu anonymisieren sind insbesondere:

- Name,
- E-Mail,
- Personalnummer,
- Bereich / Team, soweit identifizierend,
- konkrete Gesundheitsdetails,
- Dokumentnamen,
- Freitextstellen mit Rückschluss auf Person.

Freitexte werden nicht automatisch vollständig anonymisiert. Sie werden als prüfpflichtig markiert. Maßnahmennotizen (`case_measure_notes`) sind ausdrücklich einbezogen; Titel, Beteiligte, Protokoll und nächste Schritte werden im bestätigten Anonymisierungspfad wie andere fallbezogene Freitexte geprüft.

## 8. Personenbindung

Wenn eine Person anonymisiert oder gelöscht wird, müssen verbundene Fallakten und Maßnahmen mitgeführt werden:

- Fallakte anonymisieren,
- Fallakte löschen,
- oder Fortspeicherung mit Grund und Prüftermin dokumentieren.

## 9. Export- und Übergabedateien

Export- und Übergabedateien sind außerhalb der Datenbank besonders risikobehaftet. Übergabepakete sind verschlüsselt, selektiv und können ein Ablaufdatum enthalten. Abgelaufene Übergabepakete dürfen nicht importiert werden. Bereits importierte Übergabedaten werden nach Ablauf der Vertretungszeit markiert; weitere Bearbeitung ist begründungspflichtig. Klartext-Exporte sind auf das erforderliche Minimum zu begrenzen und organisatorisch abzusichern.
