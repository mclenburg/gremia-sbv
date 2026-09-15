package de.gremia.sbv.companion.ui

import android.content.Context
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class AppShellRenderer(
    private val context: Context,
) {
    private val ui = GremiaUi(context)
    private val pairingPanel = PairingPanelRenderer(context, ui)
    private val snapshotPanel = SnapshotPanelRenderer(context, ui)

    fun render(
        identity: TransferIdentity,
        snapshot: MobileSnapshot?,
        onCopyRecipientToken: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
    ): ScrollView =
        ScrollView(context).apply {
            setBackgroundColor(ui.color(R.color.gremia_background))
            addView(content(identity, snapshot, onCopyRecipientToken, onAcceptFrame, onResetFrames))
        }

    private fun content(
        identity: TransferIdentity,
        snapshot: MobileSnapshot?,
        onCopyRecipientToken: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
    ): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padding = ui.dimen(R.dimen.screen_padding)
            setPadding(padding, padding, padding, padding)
            addView(ui.kicker(context.getString(R.string.app_shell_kicker)))
            addView(ui.title(context.getString(R.string.app_name)))
            addView(ui.paragraph(context.getString(R.string.app_shell_description)))
            addView(pairingPanel.render(identity, onCopyRecipientToken))
            addView(snapshotPanel.renderImport(onAcceptFrame, onResetFrames))
            addView(snapshotPanel.renderCurrent(snapshot))
        }
}
