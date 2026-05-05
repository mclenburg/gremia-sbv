# Patch 0.8.8-h.5 – E2E-Fallakten-Selektor gehärtet

## Problem

Der E2E-Test zur Fallakte suchte den synthetischen Beschreibungstext global. Dieser Text erscheint inzwischen erwartbar zweimal: einmal in der Fallliste und einmal im geöffneten Detailbereich. Playwrights Strict Mode wertet das korrekt als mehrdeutig.

## Änderung

Der Test sucht die synthetische Fallbeschreibung jetzt innerhalb der konkreten Tabellenzeile `TEST-0001 / Testperson Alpha`.

Damit prüft der Test weiterhin den synthetischen E2E-Datensatz, ohne an einer erwartbaren Dublette im UI zu scheitern.

## Keine Produktänderung

Die Änderung betrifft nur E2E-Testselektoren und Versionsdateien. Die Datenbankisolation bleibt unverändert.
