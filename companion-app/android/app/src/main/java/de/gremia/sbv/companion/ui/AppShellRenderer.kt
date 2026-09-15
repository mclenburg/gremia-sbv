package de.gremia.sbv.companion.ui

import android.content.Context
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class AppShellRenderer(
    private val context: Context,
) {
    private val ui = GremiaUi(context)
    private val pairingPanel = PairingPanelRenderer(context, ui)
    private val snapshotPanel = SnapshotPanelRenderer(context, ui)
    private val returnPanel = ReturnPanelRenderer(context, ui)

    fun render(
        identity: TransferIdentity,
        snapshot: MobileSnapshot?,
        returnDrafts: MobileReturnDraftSet,
        onCopyRecipientToken: () -> Unit,
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
        onAddReturnNote: (String, String, String) -> Unit,
        onAddReturnDeadline: (String, String, String, String?, String) -> Unit,
        onCompleteReturnDeadline: (MobileDeadlineProjection, String?) -> Unit,
        onCreateReturnPackage: () -> Unit,
        onClearReturnDrafts: () -> Unit,
    ): ScrollView =
        ScrollView(context).apply {
            setBackgroundColor(ui.color(R.color.gremia_background))
            addView(content(
                identity,
                snapshot,
                returnDrafts,
                onCopyRecipientToken,
                onScanFrame,
                onAcceptFrame,
                onResetFrames,
                onAddReturnNote,
                onAddReturnDeadline,
                onCompleteReturnDeadline,
                onCreateReturnPackage,
                onClearReturnDrafts,
            ))
        }

    private fun content(
        identity: TransferIdentity,
        snapshot: MobileSnapshot?,
        returnDrafts: MobileReturnDraftSet,
        onCopyRecipientToken: () -> Unit,
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
        onAddReturnNote: (String, String, String) -> Unit,
        onAddReturnDeadline: (String, String, String, String?, String) -> Unit,
        onCompleteReturnDeadline: (MobileDeadlineProjection, String?) -> Unit,
        onCreateReturnPackage: () -> Unit,
        onClearReturnDrafts: () -> Unit,
    ): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padding = ui.dimen(R.dimen.screen_padding)
            setPadding(padding, padding, padding, padding)
            addView(ui.kicker(context.getString(R.string.app_shell_kicker)))
            addView(ui.title(context.getString(R.string.app_name)))
            val intakeColumn = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                addView(pairingPanel.render(identity, onCopyRecipientToken))
                addView(snapshotPanel.renderImport(onScanFrame, onAcceptFrame, onResetFrames))
            }
            val workColumn = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                addView(snapshotPanel.renderCurrent(snapshot))
                addView(returnPanel.render(
                    snapshot,
                    returnDrafts,
                    onAddReturnNote,
                    onAddReturnDeadline,
                    onCompleteReturnDeadline,
                    onCreateReturnPackage,
                    onClearReturnDrafts,
                ))
            }
            addView(ui.responsiveColumns(intakeColumn, workColumn))
        }
}
