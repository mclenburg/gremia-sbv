# Berichts-PDFs und Verschlüsselung

Ab Version 0.3.37 werden erzeugte Berichte nicht mehr als offene PDF-Dateien im Exportordner archiviert.

## Speicherung

Die Datei im Exportordner erhält die Endung:

```text
.pdf.gsbvpdf
```

Dabei handelt es sich um einen verschlüsselten Gremia.SBV-Berichtsexport. Der PDF-Inhalt wird mit AES-256-GCM verschlüsselt. Der dafür verwendete Archivschlüssel wird aus dem aktiven SQLCipher-Datenbankschlüssel abgeleitet.

Das bedeutet:

- Die abgelegte Exportdatei ist nicht mit einem normalen PDF-Reader lesbar.
- Eine kopierte Exportdatei ist ohne passenden Tresor-/Datenbankschlüssel nicht sinnvoll lesbar.
- Die Exporthistorie zeigt weiterhin den logischen PDF-Dateinamen, damit die Oberfläche verständlich bleibt.

## Öffnen

Wenn ein Bericht in der App geöffnet wird, entschlüsselt Gremia.SBV die Datei und schreibt eine temporäre PDF-Arbeitskopie nach:

```text
<data>/tmp/report-preview/
```

Vor dem Erzeugen einer neuen Arbeitskopie versucht die App, alte temporäre PDFs aus diesem Ordner zu entfernen.

Wichtig: Sobald eine PDF-Arbeitskopie geöffnet oder außerhalb von Gremia.SBV gespeichert wird, liegt diese Kopie außerhalb des Tresorschutzes. Sie muss dann vom Nutzer entsprechend vertraulich behandelt oder wieder gelöscht werden.

## Grundregel

- Archiv innerhalb von Gremia.SBV: verschlüsselt.
- Bewusst geöffnete/weitergegebene PDF-Kopie: nicht automatisch verschlüsselt.
