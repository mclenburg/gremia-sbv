package de.gremia.sbv.companion.ui

import android.view.View
import android.view.WindowManager
import androidx.activity.ComponentActivity
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.security.MobileAppSettings
import de.gremia.sbv.companion.domain.security.MobileThemeMode
import de.gremia.sbv.companion.domain.security.MobileWindowProtectionPolicy

class MobileWindowProtection(
    private val activity: ComponentActivity,
    private val policy: MobileWindowProtectionPolicy = MobileWindowProtectionPolicy(),
) {
    @Suppress("DEPRECATION")
    fun apply(settings: MobileAppSettings, themeMode: MobileThemeMode) {
        val state = policy.resolve(settings, themeMode)
        if (state.preventScreenshots) {
            activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        } else {
            activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
        activity.window.statusBarColor = activity.getColor(
            if (themeMode == MobileThemeMode.Light) R.color.gremia_background_light else R.color.gremia_background,
        )
        activity.window.navigationBarColor = activity.window.statusBarColor
        val lightSystemBars = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        activity.window.decorView.systemUiVisibility = if (state.useLightSystemBars) lightSystemBars else 0
    }
}
