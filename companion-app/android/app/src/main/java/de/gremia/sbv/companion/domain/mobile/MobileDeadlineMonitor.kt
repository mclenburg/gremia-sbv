package de.gremia.sbv.companion.domain.mobile

import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

data class MobileDeadlineMonitorSummary(
    val totalOpen: Int,
    val overdue: Int,
    val dueToday: Int,
    val critical: Int,
    val nextSevenDays: Int,
)

class MobileDeadlineMonitor {
    fun summarize(
        snapshot: MobileSnapshot,
        now: Instant = Instant.now(),
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): MobileDeadlineMonitorSummary {
        val today = now.atZone(zoneId).toLocalDate()
        val nextSevenDaysBoundary = today.plusDays(7)
        val openDeadlines = snapshot.deadlines.filter { deadline -> deadline.isOpen() }
        return MobileDeadlineMonitorSummary(
            totalOpen = openDeadlines.size,
            overdue = openDeadlines.count { deadline -> deadline.isOverdue(now, zoneId) },
            dueToday = openDeadlines.count { deadline ->
                deadline.dueInstant(zoneId)?.atZone(zoneId)?.toLocalDate() == today
            },
            critical = openDeadlines.count { deadline -> deadline.severity.normalized() in CRITICAL_SEVERITIES },
            nextSevenDays = openDeadlines.count { deadline ->
                val dueDate = deadline.dueInstant(zoneId)?.atZone(zoneId)?.toLocalDate() ?: return@count false
                !dueDate.isBefore(today) && !dueDate.isAfter(nextSevenDaysBoundary)
            },
        )
    }

    companion object {
        val OPEN_STATUSES = setOf("open", "offen", "overdue", "ueberfaellig", "überfällig")
        val OVERDUE_STATUSES = setOf("overdue", "ueberfaellig", "überfällig")
        val CRITICAL_SEVERITIES = setOf("critical", "kritisch")
        val IMPORTANT_SEVERITIES = setOf("important", "hoch", "wichtig", "high")

        fun MobileDeadlineProjection.isOpen(): Boolean =
            status.normalized() in OPEN_STATUSES

        fun MobileDeadlineProjection.isOverdue(now: Instant, zoneId: ZoneId = ZoneId.systemDefault()): Boolean =
            status.normalized() in OVERDUE_STATUSES || dueInstant(zoneId)?.isBefore(now.truncatedTo(ChronoUnit.SECONDS)) == true

        fun MobileDeadlineProjection.dueInstant(zoneId: ZoneId = ZoneId.systemDefault()): Instant? =
            MobileDeadlineDateParser.parseInstant(dueAt, zoneId)

        fun MobileDeadlineProjection.reminderInstant(zoneId: ZoneId = ZoneId.systemDefault()): Instant? =
            reminderAt?.let { value -> MobileDeadlineDateParser.parseInstant(value, zoneId) }

        fun String.normalized(): String = trim().lowercase()
    }
}
