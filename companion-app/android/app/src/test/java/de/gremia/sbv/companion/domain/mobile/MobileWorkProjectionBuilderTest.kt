package de.gremia.sbv.companion.domain.mobile

import kotlin.test.Test
import kotlin.test.assertEquals

class MobileWorkProjectionBuilderTest {
    @Test
    fun groupsOnlyOpenDeadlinesByCaseAndKeepsUnknownDeadlinesVisible() {
        val snapshot = snapshot(
            cases = listOf(
                caseRecord("case-2", "SBV-2", priority = "normal"),
                caseRecord("case-1", "SBV-1", priority = "hoch"),
            ),
            deadlines = listOf(
                deadline("done-1", "case-1", "Erledigt", "2026-09-12T10:00:00Z", status = "done"),
                deadline("open-2", "case-2", "Später", "2026-09-20T10:00:00Z"),
                deadline("open-1", "case-1", "Früher", "2026-09-10T10:00:00Z"),
                deadline("orphan-1", "case-missing", "Nicht zugeordnet", "2026-09-11T10:00:00Z"),
            ),
        )

        val projection = MobileWorkProjectionBuilder().build(snapshot)

        assertEquals(listOf("case-1", "case-2"), projection.cases.map { it.caseRecord.id })
        assertEquals(listOf("open-1"), projection.cases.first().openDeadlines.map { it.id })
        assertEquals(listOf("open-2"), projection.cases.last().openDeadlines.map { it.id })
        assertEquals(listOf("orphan-1"), projection.unassignedDeadlines.map { it.id })
    }

    @Test
    fun sortsDeadlinesByDueDateBeforeSeverity() {
        val snapshot = snapshot(
            cases = listOf(caseRecord("case-1", "SBV-1")),
            deadlines = listOf(
                deadline("critical-late", "case-1", "Kritisch später", "2026-09-20T10:00:00Z", severity = "critical"),
                deadline("normal-early", "case-1", "Normal früher", "2026-09-10T10:00:00Z", severity = "normal"),
                deadline("critical-early", "case-1", "Kritisch früher", "2026-09-10T10:00:00Z", severity = "critical"),
            ),
        )

        val deadlines = MobileWorkProjectionBuilder().build(snapshot).cases.single().openDeadlines

        assertEquals(listOf("critical-early", "normal-early", "critical-late"), deadlines.map { it.id })
    }

    private fun snapshot(
        cases: List<MobileCaseProjection>,
        deadlines: List<MobileDeadlineProjection>,
    ): MobileSnapshot =
        MobileSnapshot(
            packageId = "mobile-snapshot-test",
            sourceInstanceId = "GSBV1AAAAA",
            targetInstanceId = "GSBV1BBBBB",
            returnTarget = MobileReturnTarget("GSBV1AAAAA", "fingerprint", "PUBLIC KEY"),
            createdAt = "2026-09-10T10:00:00Z",
            themeMode = "dark",
            cases = cases,
            deadlines = deadlines,
            rawPayloadJson = "{}",
        )

    private fun caseRecord(
        id: String,
        caseNumber: String,
        priority: String = "hoch",
    ): MobileCaseProjection =
        MobileCaseProjection(
            id = id,
            caseNumber = caseNumber,
            displayName = "Testperson",
            category = "beteiligung",
            status = "offen",
            priority = priority,
            updatedAt = "2026-09-10T10:00:00Z",
        )

    private fun deadline(
        id: String,
        caseId: String,
        title: String,
        dueAt: String,
        status: String = "open",
        severity: String = "important",
    ): MobileDeadlineProjection =
        MobileDeadlineProjection(
            id = id,
            caseId = caseId,
            title = title,
            dueAt = dueAt,
            severity = severity,
            status = status,
            updatedAt = "2026-09-10T10:00:00Z",
        )
}
