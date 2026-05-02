# Dokumentenspeicher-Härtung ab Version 0.3.38

## Ziel

Fallbezogene Dokumente dürfen im Gremia.SBV-Datenverzeichnis nicht als Klartext-PDF, Word- oder Excel-Datei liegen. Importierte Dokumente werden weiterhin als verschlüsselter `.gsbvdoc`-Container gespeichert. Die notwendigen Schlüssel- und Metadaten liegen in der SQLCipher-Datenbank.

## Änderungen

### Dokumentenablage

Neue Dokumentimporte werden unterhalb des aktuellen Gremia.SBV-Datenverzeichnisses abgelegt:

```text
data/documents/<fall-id>/<document-id>.gsbvdoc
```

Der Originaldateiname wird nicht als Dateiname des Containers verwendet. Der Klarname bleibt nur in der verschlüsselten SQLCipher-Datenbank erhalten.

### Öffnen von Dokumenten

Beim Öffnen eines Dokuments erzeugt Gremia.SBV eine temporäre entschlüsselte Arbeitskopie unter:

```text
data/tmp/document-preview/
```

Diese Arbeitskopien werden beim Programmstart und vor dem nächsten Öffnen eines Dokuments bereinigt. Während ein externer PDF-/Office-Viewer die Datei noch geöffnet hält, kann das Betriebssystem das Löschen ggf. verzögern.

### Export von Dokumenten

Export erzeugt bewusst eine Klartextkopie außerhalb des Gremia.SBV-Tresors. Vor dem Export zeigt die Oberfläche deshalb eine Warnung an.

### System- und Integritätsbericht

Der Systembericht prüft jetzt zusätzlich:

- Dokumentdatensätze ohne auffindbare `.gsbvdoc`-Datei
- `.gsbvdoc`-Dateien ohne Datenbankeintrag
- mögliche Klartextdateien im Dokumentenspeicher
- unvollständige Verschlüsselungsmetadaten
- Dokumente außerhalb des aktuellen Datenverzeichnisses

## Wichtig

Die Prüfung ersetzt keine forensische Sicherheitsprüfung, ist aber als laufender Selbstcheck für die SBV-Arbeit gedacht. Rot markierte Befunde im Systembericht sollten zeitnah geprüft werden.
