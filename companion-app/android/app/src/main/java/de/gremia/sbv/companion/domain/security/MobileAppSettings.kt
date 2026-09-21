package de.gremia.sbv.companion.domain.security

enum class MobileAutoLockTimeout(val minutes: Int) {
    OneMinute(1),
    FiveMinutes(5),
    FifteenMinutes(15),
    ;

    val milliseconds: Long = minutes * 60_000L

    companion object {
        fun fromMinutes(value: Int): MobileAutoLockTimeout =
            entries.firstOrNull { timeout -> timeout.minutes == value } ?: FiveMinutes
    }
}

enum class MobileThemeMode {
    Dark,
    Light,
    ;

    companion object {
        fun fromSnapshot(value: String?): MobileThemeMode =
            if (value.equals("light", ignoreCase = true)) Light else Dark
    }
}

data class MobileAppSettings(
    val autoLockTimeout: MobileAutoLockTimeout = MobileAutoLockTimeout.FiveMinutes,
    val secureScreenEnabled: Boolean = true,
)

interface MobileDataResetOperations {
    fun clearSnapshot()
    fun clearDrafts()
    fun clearSyncHistory()
    fun clearNotifications()
    fun clearTemporaryFiles()
    fun clearIdentity()
    fun resetSettings()
}

class MobileDataResetCoordinator(
    private val operations: MobileDataResetOperations,
) {
    fun clearWorkData() {
        operations.clearSnapshot()
        operations.clearDrafts()
        operations.clearSyncHistory()
        operations.clearNotifications()
        operations.clearTemporaryFiles()
    }

    fun initializeNewDevice() {
        clearWorkData()
        operations.clearIdentity()
        operations.resetSettings()
    }
}
