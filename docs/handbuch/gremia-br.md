# Gremia.BR im SBV-Arbeitsalltag

Gremia.SBV verbindet sich standardmäßig nur auf deine ausdrückliche Aktion mit Gremia.BR. Du arbeitest weiter in Gremia.SBV; der Gremia.BR-Bereich zeigt den für dich verfügbaren Arbeitsstand und bietet gezielte Aktionen für dein SBV-Gremium.

## Verbindung einrichten und aktualisieren

Aktiviere die Anbindung unter **Einstellungen → Gremia.BR**, trage Serveradresse und Anmeldedaten ein und wähle dein berechtigtes SBV-Gremium aus der geladenen Liste. Danach erscheint **Gremia.BR** in der Hauptnavigation.

Mit **Gremia.BR aktualisieren** holst du den aktuellen Arbeitsstand bewusst ab. Der Zeitpunkt des letzten erfolgreichen Abrufs steht dabei. Bis zur nächsten Aktualisierung kann die Anzeige veraltet sein. Ein fehlgeschlagener Abruf ersetzt den bisherigen Stand nicht teilweise. Die Aktion bleibt über den Ansichten **Übersicht**, **Sitzungen**, **Verfahren** und **Dokumente** erreichbar. Ein Wechsel zwischen diesen Ansichten ruft Gremia.BR nicht ab.

Optional kannst du in denselben Einstellungen **Gremia.BR nach dem Entsperren beim Programmstart automatisch aktualisieren** aktivieren. Standardmäßig ist dies ausgeschaltet. Ist es aktiviert, läuft nach dem ersten Entsperren genau ein Gesamtabruf; Erfolg oder Fehler wird im Arbeitsbereich angezeigt. Weitere Abrufe bleiben manuell, und es gibt kein Polling.

## Übersicht

**Offene Aktionen** zeigt eigene Aufgaben und ausstehende eigene Zugriffsanträge. Die separate Antragsübersicht zeigt auch bereits entschiedene Anträge. Für eine Aufgabe öffnet **Details** erst nach deinem Klick die zusätzlichen Angaben. **Statusänderungen abrufen** zeigt die aktuell von Gremia.BR angebotenen Möglichkeiten; **Statusänderung bestätigen** sendet genau deine Auswahl. Bei einem Konflikt aktualisiere Gremia.BR bewusst und prüfe danach den neuen Aufgabenstand.

## Sitzungen

In **Tagesordnung und Remote-Zugang** kannst du eine Sitzung aus dem aktuellen Arbeitsstand auswählen. **Tagesordnung abrufen** lädt die aktuelle Fassung und zeigt, welche TOPs seit der versandten Fassung hinzugefügt, geändert oder entfernt wurden. Falls keine versandte Fassung verfügbar ist, kann die App keinen Vergleich anzeigen. Prüfe die Änderungen selbst; eine rechtliche Bewertung erfolgt nicht automatisch.

Bei einer hybriden Sitzung lädt **Remote-Zugang abrufen** die Einwahldaten erst nach deinem Klick. Die Angaben werden nur in der aktuellen Ansicht gezeigt und bei Sitzungswechsel, Aktualisierung oder Verlassen der Ansicht entfernt. Gib den Zugang nur an berechtigte Teilnehmende weiter.

Mit **Niederschrift prüfen** siehst du für dieselbe Sitzung, ob eine Niederschrift vorhanden ist. Ihr Inhalt kann hier nicht angezeigt oder heruntergeladen werden. Die Anzeige verschwindet beim Sitzungswechsel oder Aktualisieren.

Über **BR-Sitzung übernehmen** kannst du eine Sitzung als lokale SBV-Arbeitskopie anlegen. Du prüfst und ergänzt dort selbst SBV-Relevanz, Position und Bewertung; spätere Änderungen in Gremia.BR ändern diese Arbeitskopie nicht automatisch. Die Sitzungsarbeit in Gremia.SBV wird im [Kapitel Dokumentation](14-dokumentation.md) beschrieben.

Ein Thema für eine BR-Sitzung kannst du als Tagesordnungspunkt anfordern. Erst die ausdrückliche Aktion sendet es an Gremia.BR; die Statusmeldung zeigt, was bestätigt wurde.

## Verfahren

Für einen neuen Sachverhalt wählst du zuerst die lokale Fallakte, gibst einen für Gremia.BR geeigneten Text ein und lädst die verfügbaren SBV-Verfahrensarten. **Übertragung prüfen** zeigt genau die Angaben, die an Gremia.BR gehen. Erst **Fall und Verfahren verbindlich anlegen** sendet sie. Interne Fallnotizen und Dokumente werden dabei nicht mitgesendet.

Nach erfolgreicher Anlage ist das Verfahren mit der lokalen Fallakte verknüpft. Aktualisiere Gremia.BR, um den neuen Stand in der Übersicht zu sehen. Falls nur der Fall bestätigt wurde, kannst du die Verfahrensanlage bewusst fortsetzen. Bei unklarem Serverstand prüfe den Fall zuerst in Gremia.BR; die App verhindert bis dahin eine erneute Anlage aus derselben Fallakte.

Du kannst auch eine lokale Fallakte mit einem bereits zugänglichen Gremia.BR-Verfahren verknüpfen. **Verfahrensdetails laden** zeigt nach deinem Klick Status, Bearbeitungsstand, ein erfasstes Ergebnis, Fristen und aktive Wiedervorlagen. Fristangaben sind der Gremia.BR-Stand und keine automatische rechtliche Bewertung durch Gremia.SBV.

Im verknüpften Verfahren kannst du Informationsanforderungen bewusst laden und eine neue Anforderung oder eigene Aufgabe anlegen. Eigene offene Aufgaben zum Verfahren erscheinen aus dem letzten Gremia.BR-Arbeitsstand; **Details** lädt zusätzliche Angaben erst auf deinen Klick. Diese Vorgänge bleiben in Gremia.BR. Eine neue Aufgabe erscheint nach dem nächsten Klick auf **Gremia.BR aktualisieren**.

Eine Fallzusammenfassung wird zunächst als lokales PDF erzeugt. Prüfe darin, welche Angaben du später weitergeben möchtest.

## Dokumente

In **Gremia.BR-Dokumente** startest du eine Suche ausdrücklich mit **Suche starten**. Sie ist auf den gewählten Sicherheitsbereich begrenzt. Wähle einen Treffer und klicke **Details abrufen**, um Schutzklasse, Versionen und vorhandene Freigaben zu sehen. Diese Angaben verschwinden bei der nächsten Aktualisierung oder beim Verlassen der Ansicht.

Im Dokumentdetail erscheinen die Signaturzustände der aktuellen Version als Zahlen. Daraus ist nicht ersichtlich, welche Person noch unterschreiben muss; die Angaben sind keine persönliche Signaturaufforderung.

Beim geöffneten Dokument kannst du unter **Zugriff beantragen** die Zugriffsart, Laufzeit und Begründung wählen. Erst **Antrag stellen** sendet den Antrag. Ein ausstehender Antrag gewährt noch keinen Zugriff; nach einer Entscheidung aktualisierst du Gremia.BR bewusst, um den eigenen Antragsstatus zu sehen.

Eine verfügbare Version kannst du mit **Version öffnen** in der externen Vorschau öffnen. Sie wird dadurch nicht dauerhaft in Gremia.SBV übernommen. Soll sie dauerhaft in einer Fallakte liegen, wähle unter **In Fallakte übernehmen** die Version und den Zielfall, prüfe den Hinweis zu Gesundheitsdaten und bestätige **Dokument dauerhaft übernehmen**. Erst dann wird eine lokale, verschlüsselte Kopie erstellt; die Herkunft bleibt am Falldokument erkennbar.

Unter **Eigene Freigaben** wählst du ein zuvor selbst übertragenes Dokument. **Freigaben abrufen** liest den aktuellen Stand erst auf deinen Klick. Du kannst eine weitere Freigabe mit Zielbereich, Zweck und Ablaufdatum anlegen oder eine bestehende aktive Freigabe mit Begründung widerrufen. Nach einer Änderung rufst du den Stand erneut bewusst ab; eine angefragte Freigabe ist noch keine aktive Freigabe.

Mit **Klassifizierung abrufen** liest du für ein eigenes übertragenes Dokument die aktuelle Schutzklasse. Eine Änderung benötigt eine Begründung und eine Vorschau; erst **Schutzklasse verbindlich ändern** sendet sie. Hat sich das Dokument inzwischen geändert, aktualisiere Gremia.BR bewusst und prüfe die Klassifizierung erneut. Gremia.BR entscheidet, ob die Änderung zulässig ist.

Für eine PDF-Übergabe wählst du das lokal erzeugte Dokument, den Ziel-Sicherheitsbereich, die Schutzklasse und den Freigabezweck aus. Prüfe vor dem Senden, welche Informationen den lokalen Arbeitsraum verlassen. **PDF übertragen und freigeben** startet die Übergabe ausdrücklich; die Statusmeldung zeigt, was Gremia.BR bestätigt hat.
