package de.gremia.sbv.companion.domain.mobile

data class MobileWorkProjection(
    val cases: List<MobileCaseWorkItem>,
    val unassignedDeadlines: List<MobileDeadlineProjection>,
)

data class MobileCaseWorkItem(
    val caseRecord: MobileCaseProjection,
    val openDeadlines: List<MobileDeadlineProjection>,
)

class MobileWorkProjectionBuilder {
    fun build(snapshot: MobileSnapshot): MobileWorkProjection {
        val openDeadlines = snapshot.deadlines
            .filter { deadline -> deadline.status.normalizedStatus() in OPEN_DEADLINE_STATUSES }
            .sortedWith(deadlineOrder)
        val caseIds = snapshot.cases.map { record -> record.id }.toSet()
        val deadlinesByCase = openDeadlines.groupBy { deadline -> deadline.caseId }

        return MobileWorkProjection(
            cases = snapshot.cases
                .sortedWith(caseOrder)
                .map { record -> MobileCaseWorkItem(record, deadlinesByCase[record.id].orEmpty()) },
            unassignedDeadlines = openDeadlines.filter { deadline -> deadline.caseId !in caseIds },
        )
    }

    private companion object {
        private val OPEN_DEADLINE_STATUSES = setOf("open", "overdue")

        private val caseOrder = compareBy<MobileCaseProjection>(
            { it.status.normalizedStatus() != "offen" && it.status.normalizedStatus() != "open" },
            { it.priority.normalizedPriorityRank() },
            { it.caseNumber.lowercase() },
        )

        private val deadlineOrder = compareBy<MobileDeadlineProjection>(
            { it.dueAt },
            { it.severity.normalizedSeverityRank() },
            { it.title.lowercase() },
        )

        private fun String.normalizedStatus(): String = trim().lowercase()

        private fun String.normalizedPriorityRank(): Int =
            when (trim().lowercase()) {
                "kritisch", "critical" -> 0
                "hoch", "high" -> 1
                "normal", "medium" -> 2
                else -> 3
            }

        private fun String.normalizedSeverityRank(): Int =
            when (trim().lowercase()) {
                "critical", "kritisch" -> 0
                "important", "hoch", "wichtig" -> 1
                "normal" -> 2
                else -> 3
            }
    }
}
