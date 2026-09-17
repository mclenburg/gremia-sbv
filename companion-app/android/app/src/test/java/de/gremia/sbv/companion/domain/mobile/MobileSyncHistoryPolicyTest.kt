package de.gremia.sbv.companion.domain.mobile

import kotlin.test.Test
import kotlin.test.assertEquals

class MobileSyncHistoryPolicyTest {
    @Test
    fun `blockiert neuen Snapshot solange mobile Aenderungen nicht zurueckgegeben wurden`() {
        val drafts = MobileReturnDraftSet(
            notes = emptyList(),
            deadlines = emptyList(),
            deadlineCompletions = emptyList(),
            inboxEntries = listOf(MobileReturnInboxDraft(
                "inbox-1", "2026-09-17T10:00:00Z", "Rückfrage", "Inhalt", null, true,
            )),
        )

        val blocked = MobileSnapshotReplacementPolicy().evaluate(drafts)
        val allowed = MobileSnapshotReplacementPolicy().evaluate(MobileReturnDraftSet(emptyList(), emptyList(), emptyList()))

        assertEquals(false, blocked.allowed)
        assertEquals(1, blocked.unsentChangeCount)
        assertEquals(true, allowed.allowed)
    }

    @Test
    fun `ordnet technische Transferereignisse neueste zuerst und verhindert Duplikate`() {
        val policy = MobileSyncHistoryPolicy()
        val older = event("snapshot:s-1", "s-1", "2026-09-16T08:00:00Z")
        val newer = event("return:r-1", "r-1", "2026-09-17T09:00:00Z")

        val events = policy.append(policy.append(emptyList(), older), newer)
        val repeated = policy.append(events, newer.copy(changeCount = 99))

        assertEquals(listOf("return:r-1", "snapshot:s-1"), repeated.map { item -> item.eventId })
        assertEquals(99, repeated.first().changeCount)
    }

    @Test
    fun `begrenzt nur die technische Historie ohne den Arbeitsdatenbestand zu veraendern`() {
        val policy = MobileSyncHistoryPolicy()
        val events = (1..60).fold(emptyList<MobileSyncEvent>()) { current, index ->
            policy.append(current, event("event-$index", "package-$index", "2026-09-17T10:${index.toString().padStart(2, '0')}:00Z"))
        }

        assertEquals(50, events.size)
        assertEquals("event-60", events.first().eventId)
        assertEquals("event-11", events.last().eventId)
    }

    private fun event(eventId: String, packageId: String, occurredAt: String) =
        MobileSyncEvent(
            eventId = eventId,
            direction = MobileSyncDirection.DesktopToMobile,
            packageId = packageId,
            occurredAt = occurredAt,
            caseCount = 2,
            deadlineCount = 3,
            changeCount = 0,
        )
}
