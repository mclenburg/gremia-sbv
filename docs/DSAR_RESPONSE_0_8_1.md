# Gremia.SBV 0.8.1 – DSGVO-Auskunftsersuchen beantworten

## Ziel

0.8.1 ergänzt im Compliance Center eine Funktion, mit der eine Antwort auf ein Auskunftsersuchen nach Art. 15 DSGVO schnell und vollständig vorbereitet werden kann.

## Funktion

Im Compliance Center gibt es jetzt:

```text
Auskunftsersuchen beantworten
```

Eingabefelder:

- Name der anfragenden Person
- Fall-/Aktenbezug
- Eingang des Ersuchens
- Antwortfrist
- Bearbeitet durch
- Identität geprüft
- Umfang des Ersuchens

## Ausgabe

Die Funktion erzeugt ein Markdown-Dokument mit:

- Vorgangsdaten
- Antwortentwurf
- Verarbeitungszwecken
- Datenkategorien
- besonderen Kategorien personenbezogener Daten
- Empfängern / Empfängerkategorien
- Speicherdauer / Löschprüfung
- Herkunft der Daten
- Hinweis auf keine automatisierte Entscheidung
- Rechtehinweisen
- Anlagenliste
- interner Prüfliste vor Versand

## Datenschutz-Hinweis

Die Funktion erzeugt eine strukturierte Antwort- und Prüfhilfe. Vor Versand müssen Identität, Umfang, Dritt-/Fremddaten, Schwärzungen und sicherer Versandweg geprüft werden.
