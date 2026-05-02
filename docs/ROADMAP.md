# Roadmap Gremia.SBV

## MVP 1: Vertrauliche Fallakte

- App-Start mit Passwort
- verschlüsselte lokale Datenbank
- Fall anlegen, bearbeiten, schließen
- Personendaten erfassen
- Gesprächsnotizen
- Dokumente anhängen
- Fristen setzen
- Dashboard mit Ampel
- verschlüsseltes Backup

## MVP 2: Arbeitserleichterung

- Vorlagenverwaltung
- Schreiben aus Fallakte erzeugen
- PDF-Export
- DOCX-Export
- iCal-Export
- Wissensdatenbank
- Kontakte

## MVP 3: SBV-Assistenten

- BEM-Assistent
- Präventionsverfahren-Assistent
- Kündigungsanhörung-Assistent
- Gleichstellungs-/GdB-Beratungsnotiz
- Arbeitsplatzanpassungs-Assistent

## MVP 4: Compliance und Qualität

- Löschkonzept
- Audit-Log-Prüfung
- Datenschutz-Self-Check
- Exportkontrolle
- anonymisierte Jahresstatistik
- verschlüsselte Amtsübergabe

## Version 0.2 – Prozessfundament

- [x] Datenbanktabellen für BEM-Prozesse
- [x] Datenbanktabellen für Gleichstellungsprozesse
- [x] Datenbanktabellen für Kündigungsanhörungen
- [x] Portabilitätsprofil
- [x] Service-Skeletons für neue Prozessmodule
- [x] UI-Karten für neue Module
- [ ] Fristenkalender als erster nutzbarer Workflow
- [ ] Fallverwaltung mit Gesprächsnotizen als täglicher Workflow
- [ ] Dokumentenmanagement mit Verschlüsselung
- [ ] Tätigkeitsbericht-Generator

## Version 0.3 – Fristen & Wiedervorlagen

- [x] Datenmodell für Fristen, Vorlagen und Fristenaudit
- [x] Standardvorlagen für BEM, Prävention, Kündigung, Gleichstellung und GdB
- [x] Service-Logik für Dashboardpflicht ab 48 Stunden vor Ablauf
- [x] Dashboard-Panel für kritische Fristen
- [x] Fristenliste mit fachlicher Trennung nach Fristentyp
- [x] Tests für 48h-Regel, kritisch und überfällig
- [ ] IPC-Anbindung an SQLCipher-Datenbank
- [ ] Formular zum Anlegen und Bearbeiten von Fristen
- [ ] iCal-Export mit vertraulichen Titeln

## 0.3.16 – Fallnotizen und Volltextsuche

- Dashboard-Kacheln ohne überflüssiges „Öffnen“-Label.
- Fallakten-Workbench mit Fallauswahl.
- Gesprächsnotizen und Protokolle pro Fallakte erfassen, bearbeiten und löschen.
- Gesundheitsbezug und Vertraulichkeitsstufe pro Notiz.
- Volltextsuche über Notizen/Protokolle und Dokumentenindex.
