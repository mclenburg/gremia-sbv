package de.gremia.sbv.companion.domain.security

data class MobileWindowProtectionState(
    val preventScreenshots: Boolean,
    val useLightSystemBars: Boolean,
)

class MobileWindowProtectionPolicy {
    fun resolve(settings: MobileAppSettings, themeMode: MobileThemeMode): MobileWindowProtectionState =
        MobileWindowProtectionState(
            preventScreenshots = settings.secureScreenEnabled,
            useLightSystemBars = themeMode == MobileThemeMode.Light,
        )
}
