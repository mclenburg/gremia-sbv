package de.gremia.sbv.companion.domain.mobile

import kotlin.test.Test
import kotlin.test.assertEquals

class MobileCaseProjectionSearchTest {
    @Test
    fun filtersByHumanReadableCaseFields() {
        val result = MobileCaseProjectionSearch().filter(
            cases = listOf(
                caseRecord("case-1", "SBV-1", "Arbeitsplatzgestaltung", "arbeitsplatzgestaltung"),
                caseRecord("case-2", "SBV-2", "BEM-Rückkehr", "bem"),
            ),
            query = "rückkehr",
        )

        assertEquals(listOf("case-2"), result.matches.map { record -> record.id })
        assertEquals(1, result.totalMatchCount)
        assertEquals(0, result.hiddenMatchCount)
    }

    @Test
    fun limitsLargeResultSetsWithoutLosingTheTotalCount() {
        val cases = (1..25).map { index ->
            caseRecord("case-$index", "SBV-$index", "Person $index", "bem")
        }

        val result = MobileCaseProjectionSearch(visibleLimit = 10).filter(cases, "")

        assertEquals(10, result.matches.size)
        assertEquals(25, result.totalMatchCount)
        assertEquals(15, result.hiddenMatchCount)
    }

    private fun caseRecord(
        id: String,
        caseNumber: String,
        displayName: String,
        category: String,
    ): MobileCaseProjection =
        MobileCaseProjection(
            id = id,
            caseNumber = caseNumber,
            displayName = displayName,
            category = category,
            status = "offen",
            priority = "normal",
            updatedAt = "2026-09-10T10:00:00Z",
        )
}
