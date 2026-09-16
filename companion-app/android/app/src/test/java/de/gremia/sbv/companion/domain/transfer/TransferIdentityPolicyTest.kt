package de.gremia.sbv.companion.domain.transfer

import java.security.SecureRandom
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class TransferIdentityPolicyTest {
    @Test
    fun createsReadableFiveCharacterInstanceIdsWithoutAmbiguousCharacters() {
        val instanceId = createInstanceId(FixedSecureRandom(0, 1, 2, 3, 4))

        assertEquals(5, instanceId.length)
        assertTrue(instanceId.all { character -> character !in setOf('0', '1', 'I', 'O') })
        requireValidInstanceId(instanceId)
    }

    @Test
    fun rejectsMalformedRecipientInstanceIds() {
        assertFailsWith<IllegalArgumentException> {
            requireValidInstanceId("IO01A")
        }
    }

    private class FixedSecureRandom(private vararg val values: Int) : SecureRandom() {
        private var index = 0

        override fun nextInt(bound: Int): Int {
            val value = values[index % values.size]
            index += 1
            return value % bound
        }
    }
}
