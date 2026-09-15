package de.gremia.sbv.companion.ui

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

object MobileDateFormatter {
    private val output = DateTimeFormatter.ofPattern("dd.MM.yyyy, HH:mm", Locale.GERMANY)

    fun formatDateTime(value: String): String =
        runCatching { OffsetDateTime.parse(value).format(output) }
            .getOrElse { value }
}
