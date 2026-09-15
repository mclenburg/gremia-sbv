package de.gremia.sbv.companion.domain.mobile

data class MobileCaseSearchResult(
    val matches: List<MobileCaseProjection>,
    val totalMatchCount: Int,
) {
    val hiddenMatchCount: Int = totalMatchCount - matches.size
}

class MobileCaseProjectionSearch(
    private val visibleLimit: Int = DEFAULT_VISIBLE_LIMIT,
) {
    fun filter(cases: List<MobileCaseProjection>, query: String): MobileCaseSearchResult {
        val normalizedQuery = query.trim().lowercase()
        val matches = if (normalizedQuery.isEmpty()) {
            cases
        } else {
            cases.filter { record -> record.matches(normalizedQuery) }
        }
        return MobileCaseSearchResult(
            matches = matches.take(visibleLimit),
            totalMatchCount = matches.size,
        )
    }

    private fun MobileCaseProjection.matches(query: String): Boolean =
        listOf(caseNumber, displayName, category, status, priority)
            .any { value -> value.lowercase().contains(query) }

    private companion object {
        private const val DEFAULT_VISIBLE_LIMIT = 12
    }
}
