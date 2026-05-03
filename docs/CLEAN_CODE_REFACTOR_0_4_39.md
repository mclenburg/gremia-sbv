# Gremia.SBV 0.4.39 – Clean-Code-Refaktorierung

## Ziel

Die bisherige `src/app/App.tsx` war zu stark angewachsen und enthielt neben Shell-Verantwortung auch zahlreiche Fachansichten, Hilfsfunktionen und Workflow-Dialoge. Version 0.4.39 reduziert die App-Shell auf Orchestrierung und schafft eine klarere Trennung.

## Änderungen

- `src/app/App.tsx` reduziert auf Authentifizierung, Provider, Navigation, Datenladen und View-Routing.
- Fachansichten und zugehörige UI-Helfer nach `src/app/workflowViews.tsx` ausgelagert.
- Provider-Wrapping bleibt in der App-Shell und ist durch `tests/providerWrappingRegression.test.ts` abgesichert.
- Nicht mehr benötigte Artefakte entfernt:
  - verschachteltes `gremia-sbv.zip`
  - ungenutzte Deadline-Demodaten
- README bereinigt und auf Version 0.4.39 aktualisiert.

## Architekturregel

`App.tsx` darf künftig keine neuen großen Fachdialoge oder Fachlisten aufnehmen. Neue UI-Komplexität soll direkt in Feature-Dateien oder dedizierte View-Module ausgelagert werden.
