# Datenbankverschlüsselung

## Grundsatz

Die lokale Datenbank wird SQLCipher-kompatibel verschlüsselt. Das schützt den Ruhezustand der Datenbankdatei und ist die zentrale technische Maßnahme für die lokale Offline-Nutzung.

## Personenverzeichnis

Namen im Personenverzeichnis sind direkte Identifikatoren für einen Schutzstatus. Sie bleiben in vorherigen innerhalb der SQLCipher-Datenbank, werden aber nicht zusätzlich feldverschlüsselt. Diese Entscheidung wird begründet mit:

- erforderlicher Suchbarkeit,
- Importabgleich,
- Dublettenprüfung,
- Datenqualität,
- begrenztem Zusatznutzen zusätzlicher Feldverschlüsselung bei lokal verschlüsselter Datenbank.

## Freitexte und Dokumente

Freitexte und Dokumente mit Gesundheitsbezug unterliegen den bestehenden Schutz-, Export- und Löschregeln. Dokumentinhalte werden nicht unverschlüsselt im Dateisystem abgelegt.
