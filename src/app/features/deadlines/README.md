# Fristen & Wiedervorlagen

Das Modul verwaltet rechtliche Fristen, Wiedervorlagen, Termine, Warnungen und Workflow-Schritte.

Harte Produktregel:

> Jede offene Frist erscheint spätestens ab 48 Stunden vor Ablauf auf dem Dashboard.

Fachliche Trennung:

- `legal_deadline`: rechtlich relevante Frist
- `follow_up`: SBV-Wiedervorlage / Nachfassen
- `appointment`: Termin
- `warning`: fachlicher Warnhinweis
- `workflow_step`: Prozessschritt in BEM, Prävention, Gleichstellung oder Kündigungsanhörung

Kündigungsanhörungen werden als kritischer Workflow behandelt und nie nur als normale Kalenderfrist.
