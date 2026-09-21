package de.gremia.sbv.companion.domain.security

import kotlin.test.Test
import kotlin.test.assertEquals

class MobileDiagnosticReportTest {
    @Test
    fun `exportiert ausschliesslich technische Zaehler und Sicherheitskonfiguration`() {
        val report = MobileDiagnosticReport(1, 35, true, 3, MobileAppSettings())
        assertEquals(
            """
                Gremia.SBV – technische Diagnose
                Berichtsformat: 1
                App-VersionCode: 1
                Android-API: 35
                Mobile-Protokoll: 1.0
                Arbeitsprojektion vorhanden: true
                Ungesendete Änderungen: 3
                Automatische Sperre (Minuten): 5
                Displayschutz aktiv: true
            """.trimIndent() + "\n",
            report.render(),
        )
    }
}
