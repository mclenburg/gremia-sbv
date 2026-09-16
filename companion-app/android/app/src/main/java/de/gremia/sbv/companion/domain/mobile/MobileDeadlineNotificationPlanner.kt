package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.CRITICAL_SEVERITIES
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.IMPORTANT_SEVERITIES
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.dueInstant
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.isOpen
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.isOverdue
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.normalized
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.reminderInstant
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

data class MobileDeadlineNotificationPlan(
    val notificationId: Int,
    val deadlineId: String,
    val triggerAt: Instant,
    val title: String,
    val body: String,
)

class MobileDeadlineNotificationPlanner {
    fun plansFor(
        snapshot: MobileSnapshot,
        now: Instant = Instant.now(),
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): List<MobileDeadlineNotificationPlan> =
        snapshot.deadlines
            .filter { deadline -> deadline.isOpen() }
            .mapNotNull { deadline -> planFor(snapshot.packageId, deadline, now, zoneId) }
            .sortedBy { plan -> plan.triggerAt }

    private fun planFor(
        packageId: String,
        deadline: MobileDeadlineProjection,
        now: Instant,
        zoneId: ZoneId,
    ): MobileDeadlineNotificationPlan? {
        val dueAt = deadline.dueInstant(zoneId) ?: return null
        val severity = deadline.severity.normalized()
        val triggerAt = when {
            deadline.isOverdue(now, zoneId) -> now.plus(OVERDUE_NOTIFICATION_DELAY)
            severity in CRITICAL_SEVERITIES -> dueAt.minus(CRITICAL_LEAD_TIME)
            severity in IMPORTANT_SEVERITIES -> dueAt.minus(IMPORTANT_LEAD_TIME)
            else -> deadline.reminderInstant(zoneId) ?: dueAt
        }.coerceAtLeast(now.plus(MINIMUM_SCHEDULE_DELAY))

        val className = when {
            deadline.isOverdue(now, zoneId) -> "überfällige"
            severity in CRITICAL_SEVERITIES -> "kritische"
            severity in IMPORTANT_SEVERITIES -> "wichtige"
            else -> "offene"
        }
        return MobileDeadlineNotificationPlan(
            notificationId = stableNotificationId(packageId, deadline.id),
            deadlineId = deadline.id,
            triggerAt = triggerAt,
            title = "Gremia.SBV",
            body = "Eine $className Frist erfordert Aufmerksamkeit.",
        )
    }

    private fun stableNotificationId(packageId: String, deadlineId: String): Int =
        "$packageId:$deadlineId".hashCode().let { value -> if (value == Int.MIN_VALUE) 1 else kotlin.math.abs(value) }

    private fun Instant.coerceAtLeast(minimum: Instant): Instant =
        if (isBefore(minimum)) minimum else this

    private companion object {
        private val MINIMUM_SCHEDULE_DELAY = Duration.ofSeconds(30)
        private val OVERDUE_NOTIFICATION_DELAY = Duration.ofSeconds(30)
        private val CRITICAL_LEAD_TIME = Duration.ofHours(24)
        private val IMPORTANT_LEAD_TIME = Duration.ofHours(48)
    }
}
