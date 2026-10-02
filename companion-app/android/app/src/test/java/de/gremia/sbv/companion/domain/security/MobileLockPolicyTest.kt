package de.gremia.sbv.companion.domain.security

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MobileLockPolicyTest {
    @Test
    fun startsLocked() {
        val state = MobileLockPolicy().initialState()

        assertTrue(state.locked)
        assertEquals("initial", state.reason)
    }

    @Test
    fun locksAfterConfiguredInactivity() {
        val policy = MobileLockPolicy(inactivityTimeoutMillis = 1_000)

        assertFalse(policy.stateForInactivity(true, lastInteractionAtMillis = 10_000, nowMillis = 10_999).locked)
        assertTrue(policy.stateForInactivity(true, lastInteractionAtMillis = 10_000, nowMillis = 11_000).locked)
    }
}
