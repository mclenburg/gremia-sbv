# Fristen- und Wiedervorlagenzentrale

## Leitentscheidung

Das Modul ist kein bloßer Kalender. Es ist ein SBV-Risiko- und Wiedervorlagesystem.

Die wichtigste Produktregel lautet:

> Jede offene Frist muss spätestens ab 48 Stunden vor ihrem Ablaufdatum auf dem Dashboard erscheinen.

Diese Regel ist im Service über `getDashboardState()` fest verankert. Sie ist bewusst nicht nur eine UI-Konvention.

## Fristentypen

| Typ | Bedeutung |
|---|---|
| `legal_deadline` | rechtlich relevante Frist, z. B. Widerspruch, Kündigung, Stellungnahme |
| `follow_up` | Wiedervorlage / Nachfassen |
| `appointment` | Termin |
| `warning` | fachlicher Warnhinweis |
| `workflow_step` | Prozessschritt in BEM, Prävention, Gleichstellung oder Kündigungsanhörung |

## Dashboardlogik

- erledigte, ausgesetzte und gelöschte Fristen werden nicht angezeigt
- überfällige Fristen werden immer angezeigt
- Fristen innerhalb der letzten 48 Stunden vor Ablauf werden immer angezeigt
- Fristen innerhalb des kritischen Schwellenwerts werden als kritisch angezeigt
- Kündigungsanhörungen erhalten zusätzlich eine handlungsorientierte Warnung

## Standardvorlagen

Die Migration `0003_deadline_center.sql` legt Vorlagen an für:

- BEM-Rückmeldung
- BEM-Erstgespräch
- BEM-Maßnahmenevaluation
- Präventionsverfahren
- Inklusionsamt-Nachfassen
- Kündigungsanhörung / SBV-Stellungnahme
- Klagefrist-Hinweis
- Gleichstellungsantrag
- Gleichstellungs-Widerspruch
- GdB-Widerspruch
- allgemeine Arbeitgeberantwort
- allgemeine Wiedervorlage

## Datenschutz

Kalender- und Dashboardtitel können über `confidential_title` entschärft werden. Für Kalenderexporte und Betriebssystembenachrichtigungen soll grundsätzlich der vertrauliche Titel verwendet werden.

Beispiel:

- interner Titel: `SBV-Stellungnahme Kündigungsanhörung`
- vertraulicher Titel: `Gremia.SBV: kritische Frist`

## Grenzen

Die Software berechnet und erinnert. Sie ersetzt keine anwaltliche Prüfung von Zugang, Bekanntgabefiktion, Rechtsbehelfsbelehrung, Sonderkündigungsschutz oder prozessualen Fristen.
