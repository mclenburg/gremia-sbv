package de.gremia.sbv.companion.data.security

import android.content.Context
import de.gremia.sbv.companion.domain.security.MobileAppSettings
import de.gremia.sbv.companion.domain.security.MobileAutoLockTimeout

class MobileAppSettingsRepository(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun load(): MobileAppSettings =
        MobileAppSettings(
            autoLockTimeout = MobileAutoLockTimeout.fromMinutes(
                preferences.getInt(AUTO_LOCK_MINUTES_KEY, MobileAutoLockTimeout.FiveMinutes.minutes),
            ),
            secureScreenEnabled = preferences.getBoolean(SECURE_SCREEN_KEY, true),
        )

    fun save(settings: MobileAppSettings) {
        preferences.edit()
            .putInt(AUTO_LOCK_MINUTES_KEY, settings.autoLockTimeout.minutes)
            .putBoolean(SECURE_SCREEN_KEY, settings.secureScreenEnabled)
            .commitOrThrow("Die Sicherheitseinstellungen konnten nicht dauerhaft gespeichert werden.")
    }

    fun reset() {
        preferences.edit().clear()
            .commitOrThrow("Die Sicherheitseinstellungen konnten nicht zurückgesetzt werden.")
    }

    private companion object {
        private const val PREFERENCES_NAME = "gremia_sbv_companion_settings"
        private const val AUTO_LOCK_MINUTES_KEY = "auto_lock_minutes_v1"
        private const val SECURE_SCREEN_KEY = "secure_screen_enabled_v1"
    }
}
