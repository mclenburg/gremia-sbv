# Electron Security Notes

Stand: **0.9.1**

Electron-Sicherheitsregeln für Gremia.SBV:

- Renderer ohne Node-Integration.
- IPC nur über validierte Bridge-Funktionen.
- Keine automatischen Netzwerkzugriffe.
- Keine externen Fonts/CDNs.
- Lokale Dateien und Exporte nur bewusst.
- Personen- und Fallaktenfunktionen dürfen keine sensiblen Daten in IPC-Fehlermeldungen oder Audit-Logs schreiben.

Die Hauptdokumentation liegt in `docs/SECURITY.md`.
