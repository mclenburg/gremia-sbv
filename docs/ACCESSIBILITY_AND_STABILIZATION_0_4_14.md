# Gremia.SBV 0.4.14 – Stabilisierung & Tastaturbedienung

Diese Version ist ein gezielter Stabilisierungsschritt vor weiteren Fachmodulen.

## Tastaturbedienung

Neue Grundbedienung:

- `Escape` schließt das oberste geöffnete Modal.
- `Tab` und `Shift+Tab` bleiben innerhalb des obersten Modals.
- `Ctrl+Enter` / `Cmd+Enter` löst die primäre Aktion im aktiven Modal aus.
- `Ctrl+N` / `Cmd+N` öffnet die Fallakte und startet die Neuanlage einer Fallakte.
- `Ctrl+F` / `Cmd+F` fokussiert das erste verfügbare Suchfeld.

Die sichtbare Fokusmarkierung wurde zentral ergänzt. Das ist bewusst als Basis für BITV-orientierte Bedienbarkeit angelegt.

## Dashboard-Kacheln

Kacheln für noch nicht produktive Module werden auf dem Dashboard nicht mehr aktiv geöffnet. Sie zeigen stattdessen klar „In Entwicklung“. Dadurch entsteht keine Erwartung, dass dort bereits ein fertiger Workflow vorhanden ist.

## ExportGuard

Export- und Zwischenablagevorgänge aus Vorlagen und Dokumenten laufen jetzt über eine zentrale Warnlogik. Die Warnung erscheint auch dann, wenn der Scanner keine Treffer findet, weil bereits das Kopieren oder Exportieren eine Datei bzw. einen Text außerhalb des verschlüsselten Tresors erzeugt.

## App.tsx-Aufräumung

Als erster Extraktionsschritt wurde `ModuleFrame` aus `App.tsx` herausgezogen. Die große Datei ist damit noch nicht gelöst, aber der Weg ist gesetzt: gemeinsame Layout- und Modalbausteine wandern schrittweise in eigene Komponenten.
