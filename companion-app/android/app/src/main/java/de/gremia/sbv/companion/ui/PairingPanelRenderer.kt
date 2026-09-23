package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.TrustedMobileDesktop

class PairingPanelRenderer(private val context: Context, private val ui: GremiaUi) {
    fun render(trusted: TrustedMobileDesktop?, onPair: () -> Unit): LinearLayout = ui.panel().apply {
        addView(ui.sectionHeader(context.getString(R.string.pairing_title), context.getString(R.string.pairing_flow_help),
            ui.button(context.getString(R.string.pairing_connect), onPair)))
        addView(ui.paragraph(trusted?.let { context.getString(R.string.pairing_desktop_value, it.identity.instanceId) }
            ?: context.getString(R.string.pairing_no_desktop)))
    }
}
