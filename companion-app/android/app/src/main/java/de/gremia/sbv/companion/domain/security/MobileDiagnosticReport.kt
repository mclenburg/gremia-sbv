package de.gremia.sbv.companion.domain.security

data class MobileDiagnosticReport(
    val appVersionCode: Long,
    val androidApi: Int,
    val snapshotPresent: Boolean,
    val pendingChanges: Int,
    val settings: MobileAppSettings,
) {
    fun render(): String = listOf(
        "Gremia.SBV – technische Diagnose",
        "Berichtsformat: 1",
        "App-VersionCode: $appVersionCode",
        "Android-API: $androidApi",
        "Mobile-Protokoll: 1.0",
        "Arbeitsprojektion vorhanden: $snapshotPresent",
        "Ungesendete Änderungen: $pendingChanges",
        "Automatische Sperre (Minuten): ${settings.autoLockTimeout.minutes}",
        "Displayschutz aktiv: ${settings.secureScreenEnabled}",
    ).joinToString("\n", postfix = "\n")
}
