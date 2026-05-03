# Gremia.SBV 0.5.8 – Datenschutz, ExportGuard und Backup-Härtung

## Ziel

0.5.8 schärft den Datenschutzpfad vor den nächsten Fachmodulen. Besonders BEM-Daten sind regelmäßig besondere Kategorien personenbezogener Daten im Sinne von Art. 9 DSGVO und stehen fachlich im Kontext von § 167 Abs. 2 SGB IX.

## BEM-ExportGuard

BEM-Dokumente werden nun über eine eigene Exportprüfung behandelt:

- BEM-Kontext wird immer kritisch bewertet.
- vertrauliche BEM-/SBV-Notizen lösen eine eigene Warnung aus.
- offene Platzhalter werden als Exportbefund angezeigt.
- Diagnose-, Therapie-, Reha-, AU- und Wiedereingliederungsbegriffe werden kritisch erkannt.

Damit soll verhindert werden, dass BEM-Dokumente unbewusst als Klartext aus dem verschlüsselten Tresor herausgegeben werden.

## BEM-Dokumentenmodal

Das Dokumentenmodal zeigt bei BEM-Maßnahmen einen eigenen Hinweis:

> BEM-Dokumente enthalten regelmäßig Gesundheits-, Datenschutz- oder Einwilligungsinformationen.

Jeder Download benötigt eine bewusste Exportbestätigung.

## Berichte

Der BEM-/Präventionsbericht wurde auf das aktuelle BEM-Schema umgestellt:

- `status`
- `privacy_notice_at`
- `consent_scope`
- `confidential_notes`

Alte Zwischenstände wie `current_phase` oder `bem_measures` werden nicht mehr verwendet.

## Backup

Backups geben nun Datenschutz- und Schemahinweise zurück:

- Backup enthält den verschlüsselten Gremia.SBV-Tresor einschließlich SBV-, BEM- und Gesundheitsdaten.
- Backup-Passphrase getrennt vom Backup aufbewahren.
- Schemaabweichungen zur erwarteten Version 0016 werden gemeldet.
- Export- und Dokumentenablagen im Backup werden gesondert erwähnt.

## Grenze

0.5.8 ersetzt keine organisatorische Datenschutzprüfung. Die App erzwingt technische Warnungen und bewusste Bestätigungen, die Entscheidung über Zulässigkeit und Empfängerkreis bleibt bei der SBV.
