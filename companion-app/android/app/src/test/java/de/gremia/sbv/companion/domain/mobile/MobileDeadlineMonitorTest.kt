package de.gremia.sbv.companion.domain.mobile

import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals

class MobileDeadlineMonitorTest {
    @Test
    fun summarizesOnlyOpenDeadlinesForTheMobileDashboard() {
        val summary = MobileDeadlineMonitor().summarize(
            snapshot = snapshot(deadlines = listOf(
                deadline("overdue", dueAt = "2026-09-15T10:00:00Z", status = "open"),
                deadline("today", dueAt = "2026-09-16T12:00:00Z", severity = "normal"),
                deadline("critical", dueAt = "2026-09-18T12:00:00Z", severity = "kritisch"),
                deadline("done", dueAt = "2026-09-16T12:00:00Z", status = "done"),
            )),
            now = Instant.parse("2026-09-16T09:00:00Z"),
            zoneId = ZoneId.of("UTC"),
        )

        assertEquals(3, summary.totalOpen)
        assertEquals(1, summary.overdue)
        assertEquals(1, summary.dueToday)
        assertEquals(1, summary.critical)
        assertEquals(2, summary.nextSevenDays)
    }

    private fun snapshot(deadlines: List<MobileDeadlineProjection>): MobileSnapshot =
        MobileSnapshot(
            packageId = "snapshot-deadline-monitor",
            sourceInstanceId = "GSBV1AAAAA",
            targetInstanceId = "GSBV1BBBBB",
            returnTarget = MobileReturnTarget("GSBV1AAAAA", "fingerprint", "PUBLIC KEY"),
            createdAt = "2026-09-16T09:00:00Z",
            themeMode = "dark",
            cases = emptyList(),
            deadlines = deadlines,
            rawPayloadJson = "{}",
        )

    private fun deadline(
        id: String,
        dueAt: String,
        status: String = "open",
        severity: String = "important",
    ): MobileDeadlineProjection =
        MobileDeadlineProjection(
            id = id,
            caseId = "case-1",
            type = "follow_up",
            title = "Arbeitgeberantwort von Max Mustermann prüfen",
            dueAt = dueAt,
            reminderAt = null,
            legalBasis = "§ 178 SGB IX",
            severity = severity,
            status = status,
            isLegalDeadline = false,
            updatedAt = "2026-09-16T08:00:00Z",
        )
}
