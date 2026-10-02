package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.CRITICAL_SEVERITIES
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.OPEN_STATUSES
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.dueInstant
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.isOverdue
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor.Companion.normalized
import java.time.Instant
import java.time.ZoneId

enum class MobileDeadlineDisplayStatus {
    Overdue,
    DueToday,
    Critical,
    Open,
}

data class MobileDeadlineWorkItem(
    val deadline: MobileDeadlineProjection,
    val caseRecord: MobileCaseProjection?,
    val displayStatus: MobileDeadlineDisplayStatus,
)

data class MobileDeadlineWorklist(
    val items: List<MobileDeadlineWorkItem>,
)

class MobileDeadlineWorklistBuilder {
    fun build(
        snapshot: MobileSnapshot,
        now: Instant = Instant.now(),
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): MobileDeadlineWorklist {
        val casesById = snapshot.cases.associateBy { record -> record.id }
        return MobileDeadlineWorklist(
            items = snapshot.deadlines
                .filter { deadline -> deadline.isOpen() }
                .map { deadline ->
                    MobileDeadlineWorkItem(
                        deadline = deadline,
                        caseRecord = casesById[deadline.caseId],
                        displayStatus = displayStatusFor(deadline, now, zoneId),
                    )
                }
                .sortedWith(compareBy(
                    { item -> item.deadline.dueInstant(zoneId) ?: Instant.MAX },
                    { item -> item.deadline.severityRank() },
                    { item -> item.caseRecord?.caseNumber?.lowercase().orEmpty() },
                    { item -> item.deadline.title.lowercase() },
                )),
        )
    }

    private fun displayStatusFor(
        deadline: MobileDeadlineProjection,
        now: Instant,
        zoneId: ZoneId,
    ): MobileDeadlineDisplayStatus {
        val dueAt = deadline.dueInstant(zoneId)
        val today = now.atZone(zoneId).toLocalDate()
        return when {
            deadline.isOverdue(now, zoneId) -> MobileDeadlineDisplayStatus.Overdue
            dueAt?.atZone(zoneId)?.toLocalDate() == today -> MobileDeadlineDisplayStatus.DueToday
            deadline.severity.normalized() in CRITICAL_SEVERITIES -> MobileDeadlineDisplayStatus.Critical
            else -> MobileDeadlineDisplayStatus.Open
        }
    }

    private fun MobileDeadlineProjection.isOpen(): Boolean =
        status.normalized() in OPEN_STATUSES

    private fun MobileDeadlineProjection.severityRank(): Int =
        when (severity.normalized()) {
            "critical", "kritisch" -> 0
            "important", "hoch", "wichtig", "high" -> 1
            "normal" -> 2
            else -> 3
        }
}

class MobileDeadlineWorklistSearch {
    fun filter(items: List<MobileDeadlineWorkItem>, query: String, limit: Int = DEFAULT_LIMIT): MobileDeadlineWorklistSearchResult {
        val normalizedQuery = query.trim().lowercase()
        val matches = if (normalizedQuery.isBlank()) {
            items
        } else {
            items.filter { item -> item.searchText().contains(normalizedQuery) }
        }
        return MobileDeadlineWorklistSearchResult(
            matches = matches.take(limit),
            totalMatchCount = matches.size,
        )
    }

    private fun MobileDeadlineWorkItem.searchText(): String =
        listOfNotNull(
            deadline.title,
            deadline.status,
            deadline.severity,
            deadline.legalBasis,
            caseRecord?.caseNumber,
            caseRecord?.displayName,
            caseRecord?.category,
        ).joinToString(" ").lowercase()

    private companion object {
        private const val DEFAULT_LIMIT = 20
    }
}

data class MobileDeadlineWorklistSearchResult(
    val matches: List<MobileDeadlineWorkItem>,
    val totalMatchCount: Int,
) {
    val hiddenMatchCount: Int = totalMatchCount - matches.size
}
