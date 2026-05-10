# Verzeichnis von Verarbeitungstätigkeiten – Gremia.SBV

Stand: **0.9.1**

## 1. Personenverzeichnis schwerbehinderter und gleichgestellter Beschäftigter

**Zweck:** SBV-Arbeitssteuerung, Beteiligungsprüfung, Fallaktenbindung, Statusablaufwarnung, Datenschutzprüfung und Art.-15-Auskunftsvorbereitung.

**Datenkategorien:** Name, Vorname, dienstliche Kontaktdaten, optional Personalnummer, Organisationseinheit, Standort, Schutzstatus, Statusgültigkeit, Beschäftigungsstatus, Fallaktenbezug, Lifecycle-Events.

**Nicht als Standard gespeichert:** GdB, Diagnosen, Krankheitsursachen, private Gesundheitsdetails.

**Empfänger:** grundsätzlich keine externen Empfänger durch die App. Weitergaben erfolgen nur durch bewusste SBV-Entscheidung und organisatorische Freigabe.

**Schutzmaßnahmen:** SQLCipher, Importvorschau, keine Rohdateispeicherung, Audit ohne Direktidentifikatoren, Lösch-/Anonymisierungsworkflow.

## 2. SBV-Fallberatung

**Zweck:** Beratung und Unterstützung schwerbehinderter, gleichgestellter und ratsuchender Beschäftigter.

**Datenkategorien:** Stammdaten, Kontaktdaten, Beschäftigungsdaten, Gesundheitsdaten, Schwerbehindertenstatus, Gleichstellung, Gesprächsnotizen, Dokumente.

**Betroffene:** ratsuchende Beschäftigte, schwerbehinderte Beschäftigte, gleichgestellte Beschäftigte, anonyme Beratungsanfragen.

**Schutzmaßnahmen:** SQLCipher, Passwortschutz, ExportGuard, Rollen-/Vertretungskonzept, Löschprüfung, Audit-Log.

## 3. Präventionsverfahren nach § 167 Abs. 1 SGB IX

**Zweck:** Dokumentation und Begleitung von Präventionsverfahren bei Schwierigkeiten im Arbeitsverhältnis.

**Datenkategorien:** Fallakte, Anlass / Gefährdung, Gesundheits- und Arbeitsplatzbezug, Arbeitgeberreaktion, Maßnahmen, Fristen, Ergebnis.

**Empfänger:** Arbeitgeber, SBV, ggf. Betriebsrat, Inklusionsamt / Integrationsamt, Agentur für Arbeit.

## 4. Betriebliches Eingliederungsmanagement

**Zweck:** Unterstützung und Begleitung des BEM nach § 167 Abs. 2 SGB IX.

**Datenkategorien:** Arbeitsunfähigkeitsbezug, Gesprächsnotizen, Maßnahmen, ärztliche Hinweise soweit erforderlich, Arbeitsplatzanpassungen, Beteiligte, Ergebnisse.

**Empfänger:** nur nach Erforderlichkeit und Einwilligung / Verfahrensmandat.

## 5. Kündigungsanhörung und Kündigungsschutz

**Zweck:** Wahrnehmung der SBV-Beteiligungsrechte und Unterstützung im besonderen Kündigungsschutz.

**Datenkategorien:** Kündigungsabsicht, Anhörungsunterlagen, Schutzstatus, Beteiligung Integrationsamt, Stellungnahmen, Fristen, Dokumente.

## 6. Gleichstellung / GdB-Beratung

**Zweck:** Beratung und Unterstützung bei Gleichstellung, Schutzstatusklärung und GdB-Angelegenheiten.

**Hinweis:** GdB kann Beratungsthema sein; der genaue GdB ist kein Standardfeld des Personenverzeichnisses.

## 7. Arbeitsplatzanpassung nach § 164 Abs. 4 SGB IX

**Zweck:** Dokumentation und Unterstützung behinderungsgerechter Beschäftigung, Arbeitsplatzgestaltung, technischer Arbeitshilfen und organisatorischer Anpassungen.

## 8. Fristen, Wiedervorlagen und iCal-Export

**Zweck:** Nachverfolgung von Fristen, Wiedervorlagen, Statusablaufwarnungen und Datenschutzprüfungen.

**Empfänger:** keine externen Empfänger durch die App. iCal-Export ist ein manueller lokaler Export.

## 9. Übergabe / Vertretung

**Zweck:** Selektive Übergabe erforderlicher Informationen an berechtigte SBV-Stellvertretung oder Nachfolge.

**Schutzmaßnahmen:** selektiver Export, Ablaufdatum, keine automatische Vollsynchronisation.
