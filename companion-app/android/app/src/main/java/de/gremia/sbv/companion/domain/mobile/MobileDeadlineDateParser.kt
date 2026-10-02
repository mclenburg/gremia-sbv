package de.gremia.sbv.companion.domain.mobile

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeParseException

object MobileDeadlineDateParser {
    fun parseInstant(value: String, zoneId: ZoneId = ZoneId.systemDefault()): Instant? {
        val trimmed = value.trim()
        if (trimmed.isBlank()) return null
        return parseAsInstant(trimmed)
            ?: parseAsLocalDateTime(trimmed, zoneId)
            ?: parseAsLocalDate(trimmed, zoneId)
    }

    private fun parseAsInstant(value: String): Instant? =
        try {
            Instant.parse(value)
        } catch (_: DateTimeParseException) {
            null
        }

    private fun parseAsLocalDateTime(value: String, zoneId: ZoneId): Instant? =
        try {
            LocalDateTime.parse(value).atZone(zoneId).toInstant()
        } catch (_: DateTimeParseException) {
            null
        }

    private fun parseAsLocalDate(value: String, zoneId: ZoneId): Instant? =
        try {
            LocalDate.parse(value).atStartOfDay(zoneId).toInstant()
        } catch (_: DateTimeParseException) {
            null
        }
}
