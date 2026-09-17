package de.gremia.sbv.companion.domain.mobile

import java.time.Instant
import java.time.ZoneId

data class MobileDashboardSummary(
    val dueToday: Int,
    val nextSevenDays: Int,
    val overdue: Int,
    val critical: Int,
    val openDeadlines: Int,
    val unsentChanges: Int,
    val recentlyEditedCases: List<MobileCaseProjection>,
    val lastSnapshotAt: String?,
    val lastSnapshotPackageId: String?,
)

class MobileDashboardBuilder(
    private val deadlineMonitor: MobileDeadlineMonitor = MobileDeadlineMonitor(),
) {
    fun build(
        snapshot: MobileSnapshot?,
        drafts: MobileReturnDraftSet,
        now: Instant = Instant.now(),
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): MobileDashboardSummary {
        if (snapshot == null) {
            return MobileDashboardSummary(
                dueToday = 0,
                nextSevenDays = 0,
                overdue = 0,
                critical = 0,
                openDeadlines = 0,
                unsentChanges = drafts.changeCount,
                recentlyEditedCases = emptyList(),
                lastSnapshotAt = null,
                lastSnapshotPackageId = null,
            )
        }

        val deadlineSummary = deadlineMonitor.summarize(snapshot, now, zoneId)
        val casesById = snapshot.cases.associateBy { record -> record.id }
        val recentCaseIds = (
            drafts.notes.map { draft -> draft.changedAt to draft.caseId } +
                drafts.deadlines.map { draft -> draft.changedAt to draft.caseId }
            )
            .sortedByDescending { entry -> parseChangedAt(entry.first) }
            .map { entry -> entry.second }
            .distinct()

        return MobileDashboardSummary(
            dueToday = deadlineSummary.dueToday,
            nextSevenDays = deadlineSummary.nextSevenDays,
            overdue = deadlineSummary.overdue,
            critical = deadlineSummary.critical,
            openDeadlines = deadlineSummary.totalOpen,
            unsentChanges = drafts.changeCount,
            recentlyEditedCases = recentCaseIds.mapNotNull(casesById::get).take(RECENT_CASE_LIMIT),
            lastSnapshotAt = snapshot.createdAt,
            lastSnapshotPackageId = snapshot.packageId,
        )
    }

    private fun parseChangedAt(value: String): Instant =
        runCatching { Instant.parse(value) }.getOrDefault(Instant.EPOCH)

    private companion object {
        private const val RECENT_CASE_LIMIT = 3
    }
}
