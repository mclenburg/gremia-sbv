# Lösch- und Anonymisierungskonzept – Gremia.SBV

Stand: 0.4.58

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

## 3. Falltypbezogene Vorschlagsfristen

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
| Audit-Logs | 12 bis 36 Monate |
| Backups | rotierend, verschlüsselt, mit Ablaufdatum |

## 4. Löschprüfung

Vor Löschung ist zu prüfen:

- Ist der Fall abgeschlossen?
- Gibt es laufende Verfahren?
- Gibt es arbeitsrechtliche oder sozialrechtliche Risiken?
- Sind Dritte betroffen?
- Ist Anonymisierung ausreichend?
- Sind Dokumente separat zu löschen?
- Sind Backups betroffen?
- Muss ein Löschprotokoll erstellt werden?

## 5. Löschprotokoll

Ein Löschprotokoll soll enthalten:

- Fall-ID,
- Aktenzeichen,
- Löschart,
- Löschgrund,
- Rechtsgrundlage,
- betroffene Datenarten,
- durchführende Person,
- Zeitpunkt,
- Hinweis auf Backup-Rotation,
- Ergebnis der Prüfung.

## 6. Anonymisierung

Anonymisierung ist vorzuziehen, wenn statistische, organisatorische oder Tätigkeitsbericht-Zwecke erhalten bleiben sollen.

Zu anonymisieren sind insbesondere:

- Name,
- E-Mail,
- Personalnummer,
- Bereich / Team, soweit identifizierend,
- konkrete Gesundheitsdetails,
- Dokumentnamen,
- Freitextstellen mit Rückschluss auf Person.

## 7. Export- und Übergabedateien

Übergabe- und Exportdateien sind besonders kritisch. Sie sollen enthalten:

- Exportgrund,
- Empfänger,
- Ablaufdatum,
- Verschlüsselung,
- Auswahlumfang,
- Hinweis auf Löschung nach Zweckende.

## 8. Keine BR-Fristen übernehmen

BR-Wahlunterlagen, BR-Sitzungsprotokolle und BR-Mitgliedschaftsdaten haben eigene Aufbewahrungskontexte. Diese dürfen nicht als Standard für SBV-Fallakten übernommen werden.
