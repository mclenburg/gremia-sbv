package de.gremia.sbv.companion.domain.mobile

import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MobileDeadlineNotificationPlannerTest {
    @Test
    fun plansConceptLeadTimesForOpenDeadlines() {
        val plans = MobileDeadlineNotificationPlanner().plansFor(
            snapshot = snapshot(deadlines = listOf(
                deadline("normal", dueAt = "2026-09-20T10:00:00Z", reminderAt = "2026-09-18T08:00:00Z", severity = "normal"),
                deadline("important", dueAt = "2026-09-20T10:00:00Z", severity = "wichtig"),
                deadline("critical", dueAt = "2026-09-20T10:00:00Z", severity = "kritisch"),
                deadline("done", dueAt = "2026-09-20T10:00:00Z", status = "done"),
            )),
            now = Instant.parse("2026-09-16T10:00:00Z"),
            zoneId = ZoneId.of("UTC"),
        ).associateBy { plan -> plan.deadlineId }

        assertEquals(3, plans.size)
        assertEquals(Instant.parse("2026-09-18T08:00:00Z"), plans.getValue("normal").triggerAt)
        assertEquals(Instant.parse("2026-09-18T10:00:00Z"), plans.getValue("important").triggerAt)
        assertEquals(Instant.parse("2026-09-19T10:00:00Z"), plans.getValue("critical").triggerAt)
    }

    @Test
    fun keepsNotificationsFreeOfCaseAndPersonDetails() {
        val plan = MobileDeadlineNotificationPlanner().plansFor(
            snapshot = snapshot(deadlines = listOf(
                deadline(
                    id = "sensitive",
                    title = "BEM-Gespräch Max Mustermann Depression",
                    dueAt = "2026-09-20T10:00:00Z",
                    severity = "kritisch",
                ),
            )),
            now = Instant.parse("2026-09-16T10:00:00Z"),
            zoneId = ZoneId.of("UTC"),
        ).single()

        val visibleNotificationText = "${plan.title} ${plan.body}"
        assertFalse(visibleNotificationText.contains("Max", ignoreCase = true))
        assertFalse(visibleNotificationText.contains("Mustermann", ignoreCase = true))
        assertFalse(visibleNotificationText.contains("BEM", ignoreCase = true))
        assertFalse(visibleNotificationText.contains("Depression", ignoreCase = true))
        assertTrue(visibleNotificationText.contains("Frist", ignoreCase = true))
    }

    private fun snapshot(deadlines: List<MobileDeadlineProjection>): MobileSnapshot =
        MobileSnapshot(
            packageId = "snapshot-notification-planner",
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
        reminderAt: String? = null,
        title: String = "Arbeitgeberantwort Max Mustermann prüfen",
    ): MobileDeadlineProjection =
        MobileDeadlineProjection(
            id = id,
            caseId = "case-1",
            type = "follow_up",
            title = title,
            dueAt = dueAt,
            reminderAt = reminderAt,
            legalBasis = "§ 178 SGB IX",
            severity = severity,
            status = status,
            isLegalDeadline = false,
            updatedAt = "2026-09-16T08:00:00Z",
        )
}
