package de.gremia.sbv.companion.domain.mobile

import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals

class MobileDashboardBuilderTest {
    @Test
    fun `fasst Arbeitsstand und ungesendete Aenderungen fachlich zusammen`() {
        val snapshot = testSnapshot()
        val drafts = MobileReturnDraftSet(
            notes = listOf(
                note("note-old", "case-a", "2026-09-16T10:00:00Z"),
                note("note-new", "case-b", "2026-09-17T09:00:00Z"),
            ),
            deadlines = listOf(deadline("draft-deadline", "case-a", "2026-09-17T11:00:00Z")),
            deadlineCompletions = listOf(completion("done-1")),
            inboxEntries = listOf(inbox("inbox-1")),
        )

        val summary = MobileDashboardBuilder().build(
            snapshot = snapshot,
            drafts = drafts,
            syncEvents = listOf(
                syncEvent("snapshot:snapshot-17", MobileSyncDirection.DesktopToMobile, "snapshot-17", "2026-09-16T18:02:00Z"),
                syncEvent("return:return-17", MobileSyncDirection.MobileToDesktop, "return-17", "2026-09-17T07:30:00Z"),
            ),
            now = Instant.parse("2026-09-17T08:00:00Z"),
            zoneId = ZoneId.of("UTC"),
        )

        assertEquals(1, summary.dueToday)
        assertEquals(2, summary.nextSevenDays)
        assertEquals(1, summary.overdue)
        assertEquals(1, summary.critical)
        assertEquals(3, summary.openDeadlines)
        assertEquals(5, summary.unsentChanges)
        assertEquals(listOf("case-a", "case-b"), summary.recentlyEditedCases.map { record -> record.id })
        assertEquals("snapshot-17", summary.lastImport?.packageId)
        assertEquals("return-17", summary.lastExport?.packageId)
    }

    @Test
    fun `bleibt vor dem ersten Snapshot aussagefaehig`() {
        val drafts = MobileReturnDraftSet(emptyList(), emptyList(), emptyList(), listOf(inbox("inbox-1")))

        val summary = MobileDashboardBuilder().build(null, drafts)

        assertEquals(0, summary.openDeadlines)
        assertEquals(1, summary.unsentChanges)
        assertEquals(emptyList(), summary.recentlyEditedCases)
        assertEquals(null, summary.lastImport)
    }

    private fun testSnapshot(): MobileSnapshot =
        MobileSnapshot(
            packageId = "snapshot-17",
            sourceInstanceId = "desktop-source",
            targetInstanceId = "mobile-target",
            returnTarget = MobileReturnTarget("desktop-source", "fingerprint", "public-key"),
            createdAt = "2026-09-16T18:00:00Z",
            themeMode = "dark",
            cases = listOf(
                case("case-a", "SBV-2026-01"),
                case("case-b", "SBV-2026-02"),
            ),
            deadlines = listOf(
                projectedDeadline("past", "case-a", "2026-09-16T12:00:00Z", "normal"),
                projectedDeadline("today", "case-a", "2026-09-17T12:00:00Z", "critical"),
                projectedDeadline("soon", "case-b", "2026-09-20T12:00:00Z", "important"),
            ),
            rawPayloadJson = "{}",
        )

    private fun case(id: String, number: String) =
        MobileCaseProjection(id, number, number, "beratung", "open", "normal", "2026-09-16T10:00:00Z")

    private fun projectedDeadline(id: String, caseId: String, dueAt: String, severity: String) =
        MobileDeadlineProjection(id, caseId, "follow_up", id, dueAt, null, null, severity, "open", false, "2026-09-16T10:00:00Z")

    private fun note(id: String, caseId: String, changedAt: String) =
        MobileReturnNoteDraft(id, caseId, changedAt, id, "Inhalt", "gespraech", null)

    private fun deadline(id: String, caseId: String, changedAt: String) =
        MobileReturnDeadlineDraft(id, caseId, changedAt, id, "2026-09-20T10:00:00Z", null, null, "normal")

    private fun completion(id: String) =
        MobileReturnDeadlineCompletionDraft(id, "past", "2026-09-17T10:00:00Z", "2026-09-16T10:00:00Z", null)

    private fun inbox(id: String) =
        MobileReturnInboxDraft(id, "2026-09-17T10:00:00Z", id, "Inhalt", null, true)

    private fun syncEvent(eventId: String, direction: MobileSyncDirection, packageId: String, occurredAt: String) =
        MobileSyncEvent(eventId, direction, packageId, occurredAt, 2, 3, 1)
}
