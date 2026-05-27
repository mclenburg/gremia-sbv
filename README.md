# Gremia.SBV

**Gremia.SBV ist ein geschützter Arbeitsraum für Schwerbehindertenvertretungen.**

Die Anwendung hilft SBVen, vertrauliche Beratung, Fallakten, Fristen, BEM, Prävention, Beteiligungen, Kündigungsanhörungen, Arbeitsplatzgestaltung, Vorlagen, Berichte und Übergaben an einem Ort zu organisieren. Alles läuft lokal auf dem eigenen Gerät. Es gibt keine Cloudpflicht, keine Telemetrie und keine Hintergrundverbindungen.

## Gremia.SBV gefahrlos ausprobieren: Demo-Modus

Wer Gremia.SBV nur ansehen, vorführen oder in einer Schulung testen möchte, muss keinen eigenen Tresor anlegen und keine echten Daten erfassen. Die fertige Anwendung kann direkt mit dem Zusatz `--demo` gestartet werden.

Unter Linux zum Beispiel:

```bash
./Gremia.SBV-linux-x86_64.AppImage --demo
```

Unter Windows zum Beispiel:

```powershell
.\Gremia.SBV-win-x64.exe --demo
```

Wenn Gremia.SBV bereits installiert ist, reicht entsprechend der Programmname mit Zusatz:

```powershell
"Gremia.SBV.exe" --demo
```

Das Demo-Passwort lautet:

```text
gremia.sbv-demo
```

Der Demo-Modus nutzt **nicht** den normalen Datenbestand. Er legt bei jedem Start eine frische Testdatenbank im temporären Systemverzeichnis an, befüllt sie mit frei erfundenen Personen, Kontakten, Fallakten, Fristen, Prozessmodulen, Maßnahmen, Vorlagen und Compliance-Ereignissen und sperrt den Tresor anschließend. Dadurch kann die Anwendung realistisch ausprobiert werden, ohne echte SBV-Daten zu verwenden oder den eigenen Datenbestand zu berühren.

Alle Demo-Daten sind frei erfunden. Der Modus ist für Vorführung, Schulung, Entwicklung und Tests gedacht.

## Warum sich ein genauer Blick lohnt

SBV-Arbeit ist oft vertraulich, zeitkritisch und schwer in normalen Bürotools abzubilden. Ein Gespräch wird zur Maßnahme. Eine Maßnahme bekommt eine Frist. Eine Frist braucht Nachverfolgung. Ein BEM-Gespräch darf nicht zur Personalakte werden. Eine Vertretung braucht genau die Informationen, die sie für eine sichere Weiterbearbeitung benötigt – aber nicht mehr.

Gremia.SBV bündelt diese Arbeit in einem lokalen, verschlüsselten Arbeitsbereich. Der Anspruch ist:

> **SBV-Arbeit vertraulich, nachvollziehbar und durchweg wirksam unterstützen.**

## Für wen ist Gremia.SBV gedacht?

Gremia.SBV richtet sich zuerst an **Schwerbehindertenvertretungen und ihre Stellvertretungen**, die ihre tägliche Arbeit sicherer, übersichtlicher und besser nachverfolgbar organisieren wollen.

Die Anwendung ist besonders hilfreich, wenn du:

- viele vertrauliche Anliegen parallel begleitest,
- Fristen und Wiedervorlagen nicht aus dem Blick verlieren darfst,
- BEM-, Präventions- oder Beteiligungsvorgänge strukturiert dokumentieren willst,
- Maßnahmen und Arbeitgeberreaktionen nachvollziehbar halten möchtest,
- Fallübergaben für Vertretung, Krankheit, Urlaub oder Amtswechsel vorbereiten musst,
- Datenschutz und Löschung nicht erst am Ende bedenken willst,
- mit Vorlagen, Wissensbausteinen und Berichten schneller arbeitsfähig sein möchtest.

Zweite Zielgruppe sind Entwicklerinnen und Entwickler, die eine freie, datenschutzorientierte Fachanwendung für Interessenvertretungen mitentwickeln wollen. Der technische Einstieg steht weiter unten.

## Was kann ich in Gremia.SBV tun?

### Fälle bearbeiten

Fallakten bündeln Beratung, Vorgänge, Notizen, Dokumente, Maßnahmen, Fristen, externe Bezüge und Verlauf. Du kannst personengebundene Akten führen oder bewusst anonyme Beratungsanfragen anlegen.

### Personen datensparsam verwalten

Das Personenverzeichnis unterstützt wiederkehrende Beratung und Fallbindungen, ohne daraus eine Personalakte zu machen. Die Personalnummer ist optional; typische Orientierungsmerkmale sind Nachname, Vorname und bei Bedarf weitere datensparsame Angaben.

### Fristen sichtbar halten

Fristen und Wiedervorlagen werden priorisiert angezeigt. Das Dashboard macht sichtbar, was ansteht, was überfällig ist und wo Handlungsbedarf besteht.

### SBV-Prozesse strukturieren

Gremia.SBV unterstützt insbesondere:

- BEM-Begleitung,
- Präventionsverfahren,
- Gleichstellung und GdB-nahe Begleitung,
- Kündigungsanhörungen,
- SBV-Beteiligungen,
- Arbeitsplatzgestaltung und Maßnahmenverfolgung.

### Dokumente, Vorlagen und Wissen nutzen

Dokumente können lokal abgelegt und über die Suche wiedergefunden werden. Vorlagen helfen bei wiederkehrenden Schreiben und internen Vermerken. Die Wissensbasis unterstützt die fachliche Einordnung, ohne die eigenständige Prüfung durch die SBV zu ersetzen.

### Berichte und Nachweise vorbereiten

Berichte, Tätigkeitsnachweise und Strukturinformationen helfen, SBV-Arbeit nachvollziehbar zu machen – für die eigene Arbeit, für Vertretung und für spätere Auswertung.

### Fälle sicher übergeben

Für Urlaubsvertretung, Krankheit oder Amtswechsel können ausgewählte Fallakten mit den erforderlichen Maßnahmen, Fristen, Notizen und Dokumenten als verschlüsseltes `.gsbvtransfer`-Paket exportiert und in einer eigenständigen Gremia.SBV-Instanz importiert werden.

## Was passiert mit meinen Daten?

Gremia.SBV behandelt SBV-Daten so, wie SBV-Daten behandelt werden müssen: lokal, verschlüsselt, zweckgebunden, nachvollziehbar und ohne unnötige Datenflüsse.

Die wichtigsten Punkte:

- **Offline-first:** keine Hintergrundverbindungen und keine Cloudpflicht.
- **Lokaler Tresor:** Daten liegen in einem verschlüsselten Vault auf dem eigenen Gerät.
- **Keine Telemetrie:** die Anwendung sendet keine Nutzungsdaten an Dritte.
- **Datenschutzpfade:** Löschung, Anonymisierung, Retention, Audit und Suchindex werden gemeinsam betrachtet.
- **Datenminimierung:** gespeichert werden soll nur, was für die konkrete SBV-Arbeit erforderlich ist.
- **Barrierefreiheit:** Bedienung, Rückmeldungen und Tests berücksichtigen assistive Nutzung; ein automatisierter Axe-Scan prüft die primären Arbeitsbereiche auf serious/critical WCAG-Verstöße.

Details stehen im [Datenschutz- und Sicherheitskonzept](docs/PRIVACY_AND_SECURITY.md). Unterlagen für Datenschutzbeauftragte und IT-Security sind in [FREIGABE_DSB_IT_SECURITY.md](docs/FREIGABE_DSB_IT_SECURITY.md) gebündelt.

## Was Gremia.SBV bewusst nicht ist

Gremia.SBV ist keine Personalakte, kein HR-System und keine Cloud-Plattform. Die Anwendung ersetzt keine rechtliche Beratung, keine Beschlussfassung des Betriebsrats und keine organisatorische Datenschutzfreigabe. Sie unterstützt die SBV dabei, ihre eigene Arbeit sauber, vertraulich und nachvollziehbar zu organisieren.

## Hinweise zu Signaturen und Sicherheitswarnungen

Die öffentlichen Artefakte werden zunächst transparent als nicht signierte Community-Builds veröffentlicht. Je nach Betriebssystem können deshalb Warnhinweise erscheinen, insbesondere Windows SmartScreen oder macOS Gatekeeper. Das bedeutet nicht automatisch, dass die Anwendung kompromittiert ist; es bedeutet, dass für diesen Build noch kein kommerzielles Code-Signing-Zertifikat beziehungsweise keine notarisierten macOS-Artefakte verwendet werden.

Die Code-Signing-Strategie und der Plan für signierte Artefakte stehen in [CODE_SIGNING.md](docs/CODE_SIGNING.md).

## Optional: Lesender Blick nach Gremia.BR

Gremia.SBV kann eine **optionale, standardmäßig deaktivierte Lesebrücke** zu Gremia.BR nutzen. Diese Verbindung ist nur für ausdrücklich ausgelöste, lesende Zugriffe gedacht. Es gibt keine Hintergrundsynchronisation und kein Rückschreiben von SBV-Daten.

## Für Mitentwickler

Gremia.SBV ist eine lokale Electron- und React-Anwendung mit klarer Trennung zwischen Oberfläche, Bridge, IPC, Services und verschlüsseltem Speicher. Der technische Einstieg steht in [ARCHITECTURE.md](docs/ARCHITECTURE.md) und [CONTRIBUTING.md](CONTRIBUTING.md).

Kurzfassung:

- Electron + React,
- Services im Main-/Backend-Layer,
- Renderer ohne direkten Datenbank- oder Netzwerkzugriff,
- typisierte Bridge/IPC,
- SQLCipher-Vault,
- Verhaltenstests vor Oberflächenkosmetik,
- keine generischen Netzwerkbrücken,
- keine verdeckten Hintergrundprozesse.

Für Entwicklerinnen und Entwickler gibt es zusätzlich den Demo-Start aus dem Quellcode:

```bash
npm run dev:demo
```

## Projektstatus und Qualität

Gremia.SBV ist eine aktiv entwickelte Open-Source-Anwendung. Der Fokus liegt auf einem belastbaren Kern für die tägliche SBV-Arbeit, nicht auf Feature-Fülle um jeden Preis.

Willkommen sind Beiträge, die Fachlichkeit, Sicherheit, Barrierefreiheit, Testbarkeit oder Bedienbarkeit verbessern.

Die verbindlichen Qualitätsregeln stehen in [QUALITY_GATE.md](docs/QUALITY_GATE.md). Sie beschreiben Offline-first-Linie, Architektur-Gates, Accessibility-Gates, Visual-QA, Axe-A11y-Scan und die Tests, die vor der Veröffentlichung grün sein müssen.
