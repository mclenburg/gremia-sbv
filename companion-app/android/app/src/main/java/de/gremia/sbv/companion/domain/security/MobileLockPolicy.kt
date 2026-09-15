package de.gremia.sbv.companion.domain.security

data class MobileLockDecision(
    val locked: Boolean,
    val reason: String,
)

class MobileLockPolicy(
    private val inactivityTimeoutMillis: Long = DEFAULT_TIMEOUT_MILLIS,
) {
    fun initialState(): MobileLockDecision =
        MobileLockDecision(locked = true, reason = "initial")

    fun stateForInactivity(unlocked: Boolean, lastInteractionAtMillis: Long, nowMillis: Long): MobileLockDecision {
        if (!unlocked) return MobileLockDecision(locked = true, reason = "already_locked")
        val inactiveMillis = nowMillis - lastInteractionAtMillis
        return if (inactiveMillis >= inactivityTimeoutMillis) {
            MobileLockDecision(locked = true, reason = "inactivity_timeout")
        } else {
            MobileLockDecision(locked = false, reason = "active")
        }
    }

    companion object {
        const val DEFAULT_TIMEOUT_MILLIS = 5 * 60 * 1000L
    }
}
