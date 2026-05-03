# DSGVO & Datenschutz – Gremia.SBV

Stand: 0.4.58  
Status: Arbeits- und Prüfdokument für die datenschutzkonforme Weiterentwicklung von Gremia.SBV.

## 1. Zweck der Anwendung

Gremia.SBV ist eine offline-first Desktop-Anwendung für die vertrauliche Fallarbeit der Schwerbehindertenvertretung. Die Anwendung unterstützt insbesondere:

- vertrauliche Beratung von schwerbehinderten und gleichgestellten Beschäftigten,
- Fallaktenführung,
- BEM-Begleitung,
- Präventionsverfahren nach § 167 Abs. 1 SGB IX,
- Kündigungsanhörungen und Kündigungsschutzvorgänge,
- Gleichstellungs- und GdB-bezogene Beratung,
- Dokumentation von Kontakten, Fristen, Dokumenten, Maßnahmen und Tätigkeitsberichten.

Die Anwendung ist bewusst nicht als allgemeine Betriebsratssoftware konzipiert. BR-Rollen wie Vorsitz, Stellvertretung, Mitglied, Ersatzmitglied oder Ausschussmitglied werden nicht als Standard-Berechtigungsmodell übernommen.

## 2. Datenschutzrechtliche Grundannahme

Gremia.SBV verarbeitet regelmäßig personenbezogene Daten und besondere Kategorien personenbezogener Daten im Sinne von Art. 9 DSGVO.

Besonders schutzbedürftig sind insbesondere:

- Schwerbehindertenstatus,
- Gleichstellung,
- GdB,
- Merkzeichen,
- gesundheitliche Einschränkungen,
- ärztliche Atteste,
- BEM-Daten,
- Präventionsverfahren,
- Kündigungsschutzverfahren,
- Arbeitsplatzanpassungen,
- psychosoziale Belastungen,
- Konflikte mit Arbeitgeber, Führungskräften oder Kolleginnen und Kollegen,
- vertrauliche Beratungsnotizen der SBV.

Die Datenschutzarchitektur muss daher von Gesundheitsdaten und höchst vertraulichen Beschäftigtendaten als Normalfall ausgehen, nicht als Ausnahme.

## 3. Rechtsgrundlagen

Die konkrete Rechtsgrundlage hängt vom Einzelfall und vom betrieblichen Verantwortlichkeitsmodell ab. Als Arbeitsgrundlage sind insbesondere zu prüfen:

- Art. 6 Abs. 1 lit. c DSGVO – rechtliche Verpflichtung,
- Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse, soweit einschlägig,
- Art. 9 Abs. 2 DSGVO – Verarbeitung besonderer Kategorien personenbezogener Daten,
- § 167 Abs. 1 SGB IX – Präventionsverfahren,
- § 167 Abs. 2 SGB IX – Betriebliches Eingliederungsmanagement,
- § 178 Abs. 1 SGB IX – Förderungs- und Überwachungsauftrag der SBV,
- § 178 Abs. 2 Satz 1 SGB IX – unverzügliche und umfassende Unterrichtung und Anhörung der SBV,
- § 164 Abs. 4 SGB IX – behinderungsgerechte Beschäftigung,
- § 168 SGB IX – Zustimmungserfordernis des Integrationsamts bei Kündigungen.

Vor produktiver Nutzung muss die konkrete Verantwortlichkeit im Betrieb geklärt werden. Je nach Betriebsmodell kann die SBV als Teil der verantwortlichen Stelle agieren; dennoch sind Zugriff, Zweckbindung und Vertraulichkeit eigenständig zu dokumentieren.

## 4. Rollen- und Zugriffskonzept

Gremia.SBV darf kein BR-Rollenkonzept unreflektiert übernehmen. Für die SBV sind folgende Rollen fachlich näherliegend:

| Rolle | Zweck | Zugriff |
|---|---|---|
| SBV-Vertrauensperson | reguläre Fallbearbeitung | Vollzugriff auf eigene SBV-Datenbank |
| herangezogene Stellvertretung | konkrete Unterstützung / Vertretung | Zugriff nur auf freigegebene oder übergebene Fälle |
| Übergabe-/Vertretungslesemodus | zeitlich begrenzte Vertretung | lesender Zugriff auf ausgewählte Fallpakete |
| technische Administration | technische Hilfe | keine fachliche Akteneinsicht |
| Prüf-/Auditrolle | datenschutzrechtliche Prüfung | Zugriff nur auf Protokolle/Metadaten, soweit erforderlich |

Technische Administration darf grundsätzlich keine Fallakteninhalte lesen. Administration und Facheinsicht sind strikt zu trennen.

Merksatz: technische Administration darf grundsätzlich keine Fallakteninhalte lesen.

## 5. Datenkategorien

Gremia.SBV muss folgende Datenkategorien unterscheiden können:

- Stammdaten der ratsuchenden Person,
- Kontaktdaten,
- Beschäftigungsdaten,
- Fallmetadaten,
- Gesprächsnotizen,
- Dokumente und Anlagen,
- Fristen,
- Maßnahmen,
- BEM-Daten,
- Präventionsdaten,
- Kündigungsdaten,
- Gleichstellungs- und GdB-Daten,
- Rechtsnormen und Wissensbezüge,
- Export- und Übergabedaten,
- Audit- und Sicherheitsprotokolle.

## 6. Datenschutz durch Technikgestaltung

Pflichtprinzipien für Gremia.SBV:

- offline-first,
- lokale verschlüsselte Datenbank,
- kein Cloud-Zwang,
- keine Telemetrie,
- keine verdeckte Synchronisation,
- Datenminimierung,
- Zweckbindung,
- ExportGuard vor sensiblen Exporten,
- bestätigungspflichtige Löschung und Anonymisierung,
- verschlüsselte Backups,
- verschlüsselte Übergabedateien,
- Protokollierung sicherheitsrelevanter Aktionen.

## 7. ExportGuard

Der ExportGuard ist ein zentrales Datenschutzmerkmal der App. Er muss insbesondere warnen bei:

- Klarnamen,
- Aktenzeichen,
- E-Mail-Adressen,
- Gesundheitsbegriffen,
- GdB,
- Gleichstellung,
- BEM,
- Kündigung,
- Attesten,
- ärztlichen Angaben,
- Inklusionsamt / Integrationsamt,
- sensiblen Gesprächsnotizen.

Für DOCX-, PDF-, Dokumenten- und Übergabeexporte soll grundsätzlich eine bewusste Bestätigung erforderlich sein. Abbruch muss den Export verhindern.

## 8. Übergabe und Vertretbarkeit

Vertretbarkeit darf nicht durch ungeprüftes Kopieren der gesamten Datenbank gelöst werden.

Zulässiges Zielmodell:

- gezielter Export einzelner Fälle,
- Auswahl mit oder ohne Dokumente,
- Auswahl mit oder ohne hochsensible Gesundheitsdetails,
- Exportgrund,
- Empfänger / Vertretung,
- Ablaufdatum der Übergabedatei,
- Verschlüsselung der Übergabedatei,
- Importprotokoll,
- keine automatische Vollsynchronisation,
- keine unkontrollierte Mehrfachkopie.

## 9. Löschung und Anonymisierung

Gremia.SBV soll Löschung und Anonymisierung fallbezogen, begründet und protokolliert unterstützen.

Automatisierte Hard Deletes ohne vorherige fachliche Prüfung sind zu vermeiden. Viele SBV-Fälle können noch arbeitsrechtlich, sozialrechtlich oder beweisrechtlich relevant sein.

Mindestanforderungen:

- Löschgrund,
- Löschart,
- Zeitpunkt,
- durchführende Person,
- betroffene Fallakte,
- betroffene Dokumente,
- Hinweis auf Backups,
- Anonymisierungsoption als Alternative.

## 10. Betroffenenrechte

Gremia.SBV soll organisatorisch unterstützen bei:

- Auskunft nach Art. 15 DSGVO,
- Berichtigung nach Art. 16 DSGVO,
- Löschung nach Art. 17 DSGVO,
- Einschränkung nach Art. 18 DSGVO,
- Datenübertragbarkeit nach Art. 20 DSGVO,
- Widerspruch nach Art. 21 DSGVO.

Eine automatische Herausgabe vollständiger Fallakten darf nicht ungeprüft erfolgen. Vertraulichkeit Dritter, rechtliche Aufbewahrungsinteressen und Mandatsgrenzen sind zu prüfen.

## 11. Datenschutzverletzungen

Für Gremia.SBV sind insbesondere folgende Vorfälle kritisch:

- Verlust eines USB-Sticks mit portabler Datenbank,
- Verlust einer Übergabedatei,
- Export an falsche Empfänger,
- unberechtigte Einsicht durch IT/Administration,
- fehlerhafte De-Anonymisierung,
- unverschlüsselte Backups,
- unverschlüsselte Dokumentenablage,
- versehentlicher Versand von Gesundheitsdaten.

Die App soll künftig eine Incident-Notiz beziehungsweise einen Datenschutzvorfall-Eintrag unterstützen.

## 12. DSFA-Hinweis

Eine Datenschutz-Folgenabschätzung ist für Gremia.SBV naheliegend, weil regelmäßig besondere Kategorien personenbezogener Daten verarbeitet werden. Die App liefert eine DSFA-Vorlage, ersetzt aber keine datenschutzrechtliche Prüfung.

## 13. Nicht übernommen aus Gremia.BR

Nicht übernommen werden:

- BR-Vorsitz als fachliche Hauptrolle,
- BR-Ausschusslogik,
- Ersatzmitgliederlogik,
- BR-Sitzungsprotokollfristen,
- BR-Wahlunterlagenlogik,
- Vollzugriff eines technischen Admins auf fachliche Beratungsdaten.

Diese Punkte können für Gremia.BR sinnvoll sein, sind aber für Gremia.SBV nicht die passende Datenschutzgrundlage.


## Ergänzung 0.5.8: BEM-Export und Backup

BEM-Dokumente werden durch den ExportGuard als kritisch behandelt. Backups enthalten den verschlüsselten Tresor einschließlich möglicher Art.-9-DSGVO-Daten und dürfen nur mit getrennter Passphrase und kontrolliertem Speicherort aufbewahrt werden.
