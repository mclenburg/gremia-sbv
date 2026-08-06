# Preload- und IPC-Vertrag

Die Renderer-Brücke ist nach Fachdomänen unter `electron/preload/` gegliedert. `electron/preload.ts` exponiert ausschließlich das tief eingefrorene API-Objekt und enthält keine Fachlogik.

Alle Renderer-Aufrufe und Main-Handler verwenden die statischen Einträge aus `electron/ipc/channels.ts`. Dynamisch zusammengesetzte Kanalnamen sind unzulässig. `npm run ipc:contracts:check` verlangt für jeden Kanal genau einen Main-Handler und genau einen Preload-Aufruf.

`createIpcInvoker` prüft Eingaben und Rückgaben auf Übertragbarkeit, bildet Main-Prozessfehler auf den gemeinsamen `RendererApplicationError` ab und gibt unbekannte Fehler nicht mit internen Meldungen oder Stacktraces an den Renderer weiter. Der Main-Prozess weist Aufrufe fremder Web-Ursprünge zurück und serialisiert nur sichere Ergebnisse.

Dateiauswahl und Exportziele bleiben Aufgabe des Main-Prozesses. Renderer-Parameter werden in den jeweiligen Handlern validiert; beliebige externe Pfade dürfen nicht ungeprüft verarbeitet werden.

## Endpunktverträge

`electron/ipc/contracts.ts` enthält für **jeden** exponierten Kanal den gemeinsamen Laufzeitvertrag. Main und Preload verwenden denselben Vertrag. Er legt die exakte Argumentzahl, die transportierbare Tupelstruktur der Eingabe, die transportierbare Ausgabe und die Zurückweisung direkt vom Renderer gelieferter absoluter Dateipfade fest.

`npm run ipc:contracts:check` bricht ab, wenn ein Kanal keinen Handler, keinen Preload-Aufruf, keinen Ein-/Ausgabevertrag oder keinen benannten Verhaltenstest besitzt. Fehlende und zusätzliche Argumente werden im Main-Prozess vor dem Fachhandler zurückgewiesen. Der Preload weist absolute POSIX- und Windows-Pfade bereits vor dem IPC-Aufruf zurück; Dateiauswahl bleibt damit beim Main-Prozess und seinen nativen Dialogen.

Produktive Aufrufe ohne nachweisbaren `senderFrame` sind unzulässig. Die Ausnahme für fehlende Frame-Metadaten gilt ausschließlich in Vitest-/Testprozessen.
