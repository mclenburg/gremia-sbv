package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class SettingsPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun render(identity: TransferIdentity, snapshot: MobileSnapshot?): LinearLayout =
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
        }

    private fun appVersion(): String =
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: context.getString(R.string.settings_version_unknown)

    private companion object {
        private const val MOBILE_PROTOCOL_VERSION = "1.0"
    }
}
