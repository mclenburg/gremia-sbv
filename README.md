# Gremia.SBV

**Gremia.SBV ist eine lokale, verschlüsselte Desktop-Anwendung für die Arbeit der Schwerbehindertenvertretung.**

Die Anwendung hilft SBVen dabei, Fallakten, Fristen, BEM-/Präventionsvorgänge, Gleichstellungsfragen, Kündigungsanhörungen, Arbeitsplatzgestaltung, Dokumente und Übergaben strukturiert zu bearbeiten – ohne Cloud, ohne versteckte Synchronisation und ohne dass sensible SBV-Daten unbemerkt das Gerät verlassen.

## Für wen ist Gremia.SBV gedacht?

**Erstrangig für Schwerbehindertenvertretungen und ihre Stellvertretungen**, die ihre Arbeit sicherer, übersichtlicher und wirksamer organisieren wollen:

- vertrauliche Fallakten statt verstreuter Notizen,
- Fristen und Wiedervorlagen mit klarer Übersicht,
- strukturierte Prozesse für BEM, Prävention, Gleichstellung, Kündigungsanhörungen und Arbeitsplatzgestaltung,
- Personenverzeichnis mit datensparsamer Fallaktenbindung,
- lokale Dokumentenablage mit Volltextsuche,
- verschlüsselte Fallübergabe für Urlaubsvertretung, Krankheit oder Amtswechsel,
- Datenschutz- und Löschpfade, die zur Sensibilität der SBV-Arbeit passen,
- ein Dashboard, das nur das zeigt, was wirklich handlungsrelevant ist.

**Zweitrangig für Entwicklerinnen und Entwickler**, die eine freie, datenschutzorientierte Fachanwendung für Interessenvertretungen mitentwickeln wollen.

## Warum Gremia.SBV?

SBV-Arbeit ist vertraulich, rechtlich anspruchsvoll und oft kleinteilig. Viele Vorgänge laufen parallel: Gespräche, Fristen, Unterlagen, Beteiligungen, Maßnahmen, Nachverfolgung und manchmal auch Vertretung. Gremia.SBV bündelt diese Arbeit in einem lokalen Arbeitsraum.

Der Anspruch ist klar:

> **SBV-Arbeit vertraulich, nachvollziehbar und durchweg wirksam unterstützen.**

## Grundprinzipien

- **Offline-first:** Keine Hintergrundverbindungen, keine Cloudpflicht.
- **Vault statt Sammelablage:** Daten liegen in einer verschlüsselten lokalen Datenbank.
- **Datenschutz zuerst:** Anonymisierung, Löschung, Retention, Audit und Suchindex werden gemeinsam gedacht.
- **Datenminimierung:** Es wird nur gespeichert, was für die konkrete SBV-Arbeit erforderlich ist.
- **SBV-Perspektive:** Die Anwendung folgt den Aufgaben und Schutzbedürfnissen der SBV – nicht einer allgemeinen Personalaktenlogik.
- **Barrierefreiheit:** Bedienung, Rückmeldungen und Tests berücksichtigen assistive Nutzung.
- **Modularität:** Fachmodule bleiben klar getrennt und testbar.
- **Einheitliche Bedienoberfläche:** Zentrale Workbench-, Formular-, Dialog-, Listen- und Statusbausteine sorgen dafür, dass Fachmodule konsistent und barrierearm bleiben.

## Zentrale Funktionen

### Fallakten

Fallakten bündeln Vorgänge, Personenbezug, Notizen, Dokumente, Maßnahmen, externe Referenzen und Verlauf. Die Anwendung unterstützt personengebundene Akten und bewusst angelegte anonyme Beratungsanfragen.

### Personenverzeichnis

Das Personenverzeichnis unterstützt die SBV bei wiederkehrenden Kontakten und Fallbindungen, bleibt aber bewusst datensparsam. Die Personalnummer ist optional; typische Orientierungsmerkmale sind Nachname, Vorname und bei Bedarf weitere datensparsame Angaben.

### Fristen und Wiedervorlagen

Fristen werden sichtbar, priorisiert und exportierbar. Das Dashboard markiert, ob Fristen anstehen oder bereits überschritten sind.

### Prozessmodule

Gremia.SBV unterstützt insbesondere:

- BEM-Begleitung,
- Präventionsverfahren,
- Gleichstellung / GdB-nahe Begleitung,
- Kündigungsanhörungen,
- SBV-Beteiligungen,
- Arbeitsplatzgestaltung und Maßnahmenverfolgung.

### Dokumente und Volltextsuche

Dokumente können lokal abgelegt, textlich extrahiert und in die Fallaktensuche aufgenommen werden. Der Suchindex liegt im verschlüsselten Vault und folgt den Datenschutzpfaden.

### Verschlüsselte Fallübergabe

Für Urlaubsvertretung, Krankheit oder Amtswechsel können ausgewählte Fallakten mit ihren erforderlichen Maßnahmen, Fristen, Notizen und Dokumenten als verschlüsseltes `.gsbvtransfer`-Paket exportiert und in einer eigenständigen Gremia.SBV-Instanz importiert werden. Abgelaufene Übergabepakete dürfen nicht importiert werden. Bereits importierte Übergabedaten werden nach Ablauf der Vertretungszeit als abgelaufen markiert und können nur nach bewusster Bestätigung weiterbearbeitet werden.

### Compliance-Center

Das Compliance-Center zeigt Integrität, Datenschutzstatus und relevante Warnungen. Es unterstützt Arbeitsentwürfe für Datenschutzunterlagen und Art.-15-Auskunftsersuchen. Vor Herausgabe bleiben Identitätsprüfung, Drittdatenprüfung, Schwärzung und rechtliche Freigabe organisatorische Aufgaben.

### Optionale Gremia.BR-Lesebrücke

Gremia.SBV kann eine **optionale, standardmäßig deaktivierte Lesebrücke** zu Gremia.BR nutzen. Diese Verbindung ist nur für ausdrücklich ausgelöste, lesende Zugriffe gedacht. Es gibt keine Hintergrundsynchronisation und kein Rückschreiben von SBV-Daten.


## Demo-Modus

Für Präsentationen, Schulungen und schnelle Produkttests kann Gremia.SBV mit synthetischen Daten gestartet werden:

```bash
electron . --demo
```

oder während der Entwicklung:

```bash
npm run dev:demo
```

Der Demo-Modus nutzt **nicht** den normalen Datenbestand. Er legt bei jedem Start eine frische Testdatenbank im temporären Systemverzeichnis an, befüllt sie mit synthetischen Personen, Kontakten, Fallakten, Fristen, Prozessmodulen, Maßnahmen, Vorlagen und Compliance-Ereignissen und sperrt den Tresor anschließend. Das Demo-Passwort lautet:

```text
gremia.sbv-demo
```

Alle Demo-Daten sind frei erfunden. Der Modus ist ausschließlich für Vorführung, Entwicklung und Tests gedacht.

## Datenschutz in einem Satz

Gremia.SBV behandelt SBV-Daten so, wie SBV-Daten behandelt werden müssen: lokal, verschlüsselt, zweckgebunden, nachvollziehbar und ohne unnötige Datenflüsse.

Details stehen im [Datenschutz- und Sicherheitskonzept](docs/PRIVACY_AND_SECURITY.md).

## Für Mitentwickler

Der technische Einstieg steht in [ARCHITECTURE.md](docs/ARCHITECTURE.md) und [CONTRIBUTING.md](CONTRIBUTING.md).

Kurzfassung:

- Electron + React,
- Services im Main-/Backend-Layer,
- Renderer ohne direkten Datenbank- oder Netzwerkzugriff,
- typisierte Bridge/IPC,
- SQLCipher-Vault,
- Verhaltenstests vor Oberflächenkosmetik,
- keine generischen Netzwerkbrücken,
- keine verdeckten Hintergrundprozesse.

## Projektstatus

Gremia.SBV ist eine aktiv entwickelte Open-Source-Anwendung. Der Fokus liegt auf einem belastbaren Kern für die tägliche SBV-Arbeit, nicht auf Feature-Fülle um jeden Preis.

Willkommen sind Beiträge, die Fachlichkeit, Sicherheit, Barrierefreiheit, Testbarkeit oder Bedienbarkeit verbessern.


## Release-Qualität

Gremia.SBV 1.0 folgt der verbindlichen Release-Readiness-Checkliste in `docs/QUALITY_GATE_1_0.md`. Sie beschreibt die Offline-first-Linie, Architektur-Gates, Accessibility-Gates, Visual-QA und die Tests, die vor Veröffentlichung grün sein müssen.
