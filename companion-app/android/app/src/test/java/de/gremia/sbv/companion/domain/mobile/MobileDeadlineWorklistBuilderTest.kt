package de.gremia.sbv.companion.domain.mobile

import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals

class MobileDeadlineWorklistBuilderTest {
    @Test
    fun createsSortedReadOnlyDeadlineWorklistWithStatusAndCaseReference() {
        val worklist = MobileDeadlineWorklistBuilder().build(
            snapshot = snapshot(
                cases = listOf(
                    caseRecord("case-b", "SBV-B", "Max Mustermann"),
                    caseRecord("case-a", "SBV-A", "Anja Beispiel"),
                ),
                deadlines = listOf(
                    deadline("done", "case-a", "Erledigt", "2026-09-17T10:00:00Z", status = "done"),
                    deadline("open-later", "case-b", "Später", "2026-09-25T10:00:00Z", severity = "normal"),
                    deadline("critical-today", "case-a", "Heute kritisch", "2026-09-17T14:00:00Z", severity = "kritisch"),
                    deadline("overdue", "case-b", "Überfällig", "2026-09-16T10:00:00Z", severity = "normal"),
                    deadline("orphan", "missing", "Ohne Fall", "2026-09-18T10:00:00Z", severity = "hoch"),
                ),
            ),
            now = Instant.parse("2026-09-17T09:00:00Z"),
            zoneId = ZoneId.of("UTC"),
        )

        assertEquals(listOf("overdue", "critical-today", "orphan", "open-later"), worklist.items.map { item -> item.deadline.id })
        assertEquals(MobileDeadlineDisplayStatus.Overdue, worklist.items[0].displayStatus)
        assertEquals(MobileDeadlineDisplayStatus.DueToday, worklist.items[1].displayStatus)
        assertEquals("SBV-A", worklist.items[1].caseRecord?.caseNumber)
        assertEquals(null, worklist.items[2].caseRecord)
    }

    @Test
    fun filtersDeadlineWorklistByCasePersonTitleAndLegalBasis() {
        val worklist = MobileDeadlineWorklist(
            items = listOf(
                workItem("deadline-1", "Arbeitgeberantwort prüfen", caseRecord("case-1", "SBV-1", "Max Mustermann"), "§ 178 SGB IX"),
                workItem("deadline-2", "Unterlagen nachfordern", caseRecord("case-2", "SBV-2", "Anja Beispiel"), "§ 167 SGB IX"),
            ),
        )
        val search = MobileDeadlineWorklistSearch()

        assertEquals(listOf("deadline-1"), search.filter(worklist.items, "mustermann").matches.map { item -> item.deadline.id })
        assertEquals(listOf("deadline-2"), search.filter(worklist.items, "167").matches.map { item -> item.deadline.id })
        assertEquals(listOf("deadline-1"), search.filter(worklist.items, "arbeitgeberantwort").matches.map { item -> item.deadline.id })
    }

    private fun snapshot(
        cases: List<MobileCaseProjection>,
        deadlines: List<MobileDeadlineProjection>,
    ): MobileSnapshot =
        MobileSnapshot(
            packageId = "snapshot-worklist-test",
            sourceInstanceId = "GSBV1AAAAA",
            targetInstanceId = "GSBV1BBBBB",
            returnTarget = MobileReturnTarget("GSBV1AAAAA", "fingerprint", "PUBLIC KEY"),
            createdAt = "2026-09-17T09:00:00Z",
            themeMode = "dark",
            cases = cases,
            deadlines = deadlines,
            rawPayloadJson = "{}",
        )

    private fun workItem(
        id: String,
        title: String,
        caseRecord: MobileCaseProjection,
        legalBasis: String,
    ): MobileDeadlineWorkItem =
        MobileDeadlineWorkItem(
            deadline = deadline(id, caseRecord.id, title, "2026-09-20T10:00:00Z", legalBasis = legalBasis),
            caseRecord = caseRecord,
            displayStatus = MobileDeadlineDisplayStatus.Open,
        )

    private fun caseRecord(id: String, caseNumber: String, displayName: String): MobileCaseProjection =
        MobileCaseProjection(
            id = id,
            caseNumber = caseNumber,
            displayName = displayName,
            category = "beteiligung",
            status = "offen",
            priority = "normal",
            updatedAt = "2026-09-17T09:00:00Z",
        )

    private fun deadline(
        id: String,
        caseId: String,
        title: String,
        dueAt: String,
        status: String = "open",
        severity: String = "normal",
        legalBasis: String = "§ 178 SGB IX",
    ): MobileDeadlineProjection =
        MobileDeadlineProjection(
            id = id,
            caseId = caseId,
            type = "follow_up",
            title = title,
            dueAt = dueAt,
            reminderAt = null,
            legalBasis = legalBasis,
            severity = severity,
            status = status,
            isLegalDeadline = false,
            updatedAt = "2026-09-17T09:00:00Z",
        )
}
