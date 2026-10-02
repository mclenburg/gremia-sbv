package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class MobileReturnPayloadBuilderTest {
    @Test
    fun `entfernt eine ausgewaehlte mobile Aenderung ohne andere Entwuerfe anzutasten`() {
        val drafts = returnDrafts()

        val remaining = drafts.without("note-mobile-1")

        assertEquals(0, remaining.notes.size)
        assertEquals(3, remaining.changeCount)
        assertEquals(listOf("deadline-mobile-1"), remaining.deadlines.map { draft -> draft.mobileId })
        assertEquals(listOf("inbox-mobile-1"), remaining.inboxEntries.map { draft -> draft.mobileId })
    }

    @Test
    fun plansEverySupportedMobileChange() {
        val plan = MobileReturnPayloadBuilder().plan(
            packageId = "mobile_return_test",
            createdAt = "2026-09-15T10:00:00Z",
            snapshot = snapshot(),
            sourceIdentity = identity(),
            drafts = MobileReturnDraftSet(
                notes = listOf(MobileReturnNoteDraft(
                    mobileId = "note-1",
                    caseId = "case-1",
                    changedAt = "2026-09-15T10:01:00Z",
                    title = "Gespräch",
                    content = "Gesprächsnotiz",
                    noteType = "interne_notiz",
                    nextSteps = "Maßnahmenidee am Desktop prüfen",
                )),
                deadlines = listOf(MobileReturnDeadlineDraft(
                    mobileId = "deadline-1",
                    caseId = "case-1",
                    changedAt = "2026-09-15T10:02:00Z",
                    title = "Rückmeldung prüfen",
                    dueAt = "2026-09-20T10:00:00Z",
                    reminderAt = null,
                    description = "Arbeitgeberantwort nachhalten",
                    severity = "important",
                )),
                deadlineCompletions = listOf(MobileReturnDeadlineCompletionDraft(
                    mobileId = "done-1",
                    deadlineId = "deadline-source-1",
                    changedAt = "2026-09-15T10:03:00Z",
                    baseUpdatedAt = "2026-09-10T10:00:00Z",
                    completedNote = "im Termin erledigt",
                )),
                inboxEntries = listOf(MobileReturnInboxDraft(
                    mobileId = "inbox-1",
                    changedAt = "2026-09-15T10:04:00Z",
                    title = "Fallfreie Rückfrage",
                    content = "Gesprächsinhalt für spätere Zuordnung",
                    nextSteps = "Desktop-Zuordnung prüfen",
                    containsHealthData = true,
                )),
            ),
        )

        assertEquals("mobile_return_test", plan.packageId)
        assertEquals("GSBV1BBBBB", plan.sourceInstanceId)
        assertEquals("GSBV1AAAAA", plan.targetInstanceId)
        assertEquals(listOf("create_note", "create_deadline", "complete_deadline", "create_inbox"), plan.changes.map { it.type })
        assertEquals(true, plan.changes.first().values["containsHealthData"])
        assertEquals("interne_notiz", plan.changes.first().values["noteType"])
        assertEquals("Maßnahmenidee am Desktop prüfen", plan.changes.first().values["nextSteps"])
        assertEquals("Desktop-Zuordnung prüfen", plan.changes.last().values["nextSteps"])
    }

    @Test
    fun rejectsEmptyReturnPackages() {
        assertFailsWith<IllegalArgumentException> {
            MobileReturnPayloadBuilder().build(
                packageId = "empty",
                createdAt = "2026-09-15T10:00:00Z",
                snapshot = snapshot(),
                sourceIdentity = identity(),
                drafts = MobileReturnDraftSet(emptyList(), emptyList(), emptyList(), emptyList()),
            )
        }
    }

    private fun snapshot(): MobileSnapshot =
        MobileSnapshot(
            packageId = "snapshot-1",
            sourceInstanceId = "GSBV1AAAAA",
            targetInstanceId = "GSBV1BBBBB",
            returnTarget = MobileReturnTarget("GSBV1AAAAA", "fingerprint", "PUBLIC KEY"),
            createdAt = "2026-09-10T10:00:00Z",
            themeMode = "dark",
            cases = emptyList(),
            deadlines = emptyList(),
            rawPayloadJson = "{}",
        )

    private fun returnDrafts(): MobileReturnDraftSet =
        MobileReturnDraftSet(
            notes = listOf(MobileReturnNoteDraft(
                "note-mobile-1", "case-1", "2026-09-15T10:01:00Z", "Notiz", "Inhalt", "gespraech", null,
            )),
            deadlines = listOf(MobileReturnDeadlineDraft(
                "deadline-mobile-1", "case-1", "2026-09-15T10:02:00Z", "Frist", "2026-09-20T10:00:00Z", null, null, "normal",
            )),
            deadlineCompletions = listOf(MobileReturnDeadlineCompletionDraft(
                "done-mobile-1", "deadline-1", "2026-09-15T10:03:00Z", "2026-09-10T10:00:00Z", null,
            )),
            inboxEntries = listOf(MobileReturnInboxDraft(
                "inbox-mobile-1", "2026-09-15T10:04:00Z", "Inbox", "Inhalt", null, true,
            )),
        )

    private fun identity(): TransferIdentity =
        TransferIdentity(
            instanceId = "GSBV1BBBBB",
            keyFingerprint = "fingerprint",
            publicKeyPem = "PUBLIC KEY",
            privateKeyPem = "PRIVATE KEY",
            recipientToken = "GSBV1BBBBB:PUBLIC",
            createdAt = "2026-09-10T10:00:00Z",
        )
}
