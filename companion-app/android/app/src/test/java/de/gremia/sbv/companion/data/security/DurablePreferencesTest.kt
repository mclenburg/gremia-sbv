package de.gremia.sbv.companion.data.security

import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class DurablePreferencesTest {
    @Test
    fun `bestätigte Speicherung wird akzeptiert`() {
        requireCommitted(true, "Speichern fehlgeschlagen")
        assertTrue(true)
    }

    @Test
    fun `fehlgeschlagene Speicherung wird nicht als Erfolg behandelt`() {
        val failure = assertFailsWith<IllegalStateException> {
            requireCommitted(false, "Mobile Änderungen konnten nicht dauerhaft gespeichert werden.")
        }
        assertTrue(failure.message.orEmpty().contains("nicht dauerhaft gespeichert"))
    }
}
