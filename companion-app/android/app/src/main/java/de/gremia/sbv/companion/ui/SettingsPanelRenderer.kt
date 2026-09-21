package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.security.MobileAppSettings
import de.gremia.sbv.companion.domain.security.MobileAutoLockTimeout
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class SettingsPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun render(
        identity: TransferIdentity,
        snapshot: MobileSnapshot?,
        settings: MobileAppSettings,
        onSetAutoLockTimeout: (MobileAutoLockTimeout) -> Unit,
        onSetSecureScreen: (Boolean) -> Unit,
        onClearWorkData: () -> Unit,
        onInitializeNewDevice: () -> Unit,
        onExportDiagnostics: () -> Unit,
    ): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.settings_kicker)))
            addView(ui.sectionHeader(
                context.getString(R.string.settings_title),
                context.getString(R.string.settings_help),
            ))
            addView(ui.fieldLabel(context.getString(R.string.settings_mobile_instance)))
            addView(ui.monospaceValue(identity.instanceId, context.getString(R.string.settings_mobile_instance)))
            addView(ui.fieldLabel(context.getString(R.string.settings_desktop_instance)))
            addView(ui.monospaceValue(
                snapshot?.sourceInstanceId ?: context.getString(R.string.settings_not_connected),
                context.getString(R.string.settings_desktop_instance),
            ))
            addView(ui.fieldLabel(context.getString(R.string.settings_desktop_fingerprint)))
            addView(ui.monospaceValue(
                snapshot?.returnTarget?.keyFingerprint ?: context.getString(R.string.settings_not_connected),
                context.getString(R.string.settings_desktop_fingerprint),
            ))
            addView(ui.fieldLabel(context.getString(R.string.settings_version)))
            addView(ui.listItem(
                primary = context.getString(R.string.settings_app_version, appVersion()),
                secondary = context.getString(R.string.settings_protocol_version, MOBILE_PROTOCOL_VERSION),
            ))
            addView(ui.confirmingSecondaryButton(
                context.getString(R.string.diagnostic_export),
                context.getString(R.string.diagnostic_export),
                context.getString(R.string.diagnostic_scope),
                onExportDiagnostics,
            ))
            addView(ui.fieldLabel(context.getString(R.string.settings_auto_lock)))
            addView(ui.horizontalActions(*MobileAutoLockTimeout.entries.map { timeout ->
                ui.navigationButton(
                    autoLockLabel(timeout),
                    settings.autoLockTimeout == timeout,
                ) { onSetAutoLockTimeout(timeout) }
            }.toTypedArray()))
            addView(ui.fieldLabel(context.getString(R.string.settings_screen_security)))
            addView(ui.listItem(
                primary = context.getString(
                    if (settings.secureScreenEnabled) R.string.settings_screen_security_on else R.string.settings_screen_security_off,
                ),
                secondary = null,
            ))
            if (settings.secureScreenEnabled) {
                addView(ui.confirmingSecondaryButton(
                    context.getString(R.string.settings_screen_security_disable),
                    context.getString(R.string.settings_screen_security_disable_title),
                    context.getString(R.string.settings_screen_security_disable_message),
                ) { onSetSecureScreen(false) })
            } else {
                addView(ui.button(context.getString(R.string.settings_screen_security_enable)) { onSetSecureScreen(true) })
            }
            addView(ui.fieldLabel(context.getString(R.string.settings_mobile_data)))
            addView(ui.horizontalActions(
                ui.confirmingSecondaryButton(
                    context.getString(R.string.settings_clear_work_data),
                    context.getString(R.string.settings_clear_work_data_title),
                    context.getString(R.string.settings_clear_work_data_message),
                    onClearWorkData,
                ),
                ui.confirmingSecondaryButton(
                    context.getString(R.string.settings_initialize_device),
                    context.getString(R.string.settings_initialize_device_title),
                    context.getString(R.string.settings_initialize_device_message),
                    onInitializeNewDevice,
                ),
            ))
        }

    private fun appVersion(): String =
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: context.getString(R.string.settings_version_unknown)

    private fun autoLockLabel(timeout: MobileAutoLockTimeout): String =
        context.getString(when (timeout) {
            MobileAutoLockTimeout.OneMinute -> R.string.settings_auto_lock_one_minute
            MobileAutoLockTimeout.FiveMinutes -> R.string.settings_auto_lock_five_minutes
            MobileAutoLockTimeout.FifteenMinutes -> R.string.settings_auto_lock_fifteen_minutes
        })

    private companion object {
        private const val MOBILE_PROTOCOL_VERSION = "1.0"
    }
}
