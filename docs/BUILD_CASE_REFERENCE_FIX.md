# Build-Fix: Fallbezug in Fristeneditor

Version: 0.3.24

## Problem

Der Build brach in `src/app/App.tsx` ab, weil der Fristeneditor intern auf `cases` zugriff, ohne diese Fallliste als Prop zu erhalten. Im Dev-Modus konnte dieser Fehler je nach Hot-Reload-Situation verdeckt bleiben, der produktive TypeScript-Build bricht aber korrekt ab.

## Lösung

`DeadlineEditor` erhält die Fallliste nun explizit als Prop. Die Anzeige des Fallbezugs löst die technische `caseId` auf das fachliche Aktenzeichen auf.

In der Oberfläche darf weiterhin keine UUID als Fallbezug erscheinen.
