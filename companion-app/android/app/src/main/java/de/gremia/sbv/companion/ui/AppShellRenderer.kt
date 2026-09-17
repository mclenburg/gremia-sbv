package de.gremia.sbv.companion.ui

import android.content.Context
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection
import de.gremia.sbv.companion.domain.mobile.MobilePairingResponseResult
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotImportPreview
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
        pendingImport: MobileSnapshotImportPreview?,
        returnDrafts: MobileReturnDraftSet,
        activeSection: MobileAppSection,
        onSelectSection: (MobileAppSection) -> Unit,
        onCopyRecipientToken: () -> Unit,
        onCreatePairingResponse: (String) -> MobilePairingResponseResult,
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
        onConfirmImport: () -> MobileSnapshotIntakeResult,
        onCancelImport: () -> MobileSnapshotIntakeResult,
        onAddReturnNote: (String, String, String) -> Unit,
        onAddReturnInbox: (String, String, String?) -> Unit,
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
                pendingImport,
                returnDrafts,
                activeSection,
                onSelectSection,
                onCopyRecipientToken,
                onCreatePairingResponse,
                onScanFrame,
                onAcceptFrame,
                onResetFrames,
                onConfirmImport,
                onCancelImport,
                onAddReturnNote,
                onAddReturnInbox,
                onAddReturnDeadline,
                onCompleteReturnDeadline,
                onCreateReturnPackage,
                onClearReturnDrafts,
            ))
        }

    private fun content(
        identity: TransferIdentity,
        snapshot: MobileSnapshot?,
        pendingImport: MobileSnapshotImportPreview?,
        returnDrafts: MobileReturnDraftSet,
        activeSection: MobileAppSection,
        onSelectSection: (MobileAppSection) -> Unit,
        onCopyRecipientToken: () -> Unit,
        onCreatePairingResponse: (String) -> MobilePairingResponseResult,
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
        onConfirmImport: () -> MobileSnapshotIntakeResult,
        onCancelImport: () -> MobileSnapshotIntakeResult,
        onAddReturnNote: (String, String, String) -> Unit,
        onAddReturnInbox: (String, String, String?) -> Unit,
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
            addView(sectionNavigation(activeSection, onSelectSection))
            when (activeSection) {
                MobileAppSection.Synchronization -> {
                    addView(pairingPanel.render(identity, onCopyRecipientToken, onCreatePairingResponse))
                    addView(snapshotPanel.renderImport(
                        pendingImport,
                        onScanFrame,
                        onAcceptFrame,
                        onResetFrames,
                        onConfirmImport,
                        onCancelImport,
                    ))
                }
                MobileAppSection.Work -> addView(snapshotPanel.renderCurrent(snapshot))
                MobileAppSection.Return -> addView(returnPanel.render(
                    snapshot,
                    returnDrafts,
                    onAddReturnNote,
                    onAddReturnInbox,
                    onAddReturnDeadline,
                    onCompleteReturnDeadline,
                    onCreateReturnPackage,
                    onClearReturnDrafts,
                ))
            }
        }

    private fun sectionNavigation(
        activeSection: MobileAppSection,
        onSelectSection: (MobileAppSection) -> Unit,
    ): LinearLayout =
        ui.horizontalActions(
            ui.navigationButton(
                context.getString(R.string.app_section_sync),
                activeSection == MobileAppSection.Synchronization,
            ) { onSelectSection(MobileAppSection.Synchronization) },
            ui.navigationButton(
                context.getString(R.string.app_section_work),
                activeSection == MobileAppSection.Work,
            ) { onSelectSection(MobileAppSection.Work) },
            ui.navigationButton(
                context.getString(R.string.app_section_return),
                activeSection == MobileAppSection.Return,
            ) { onSelectSection(MobileAppSection.Return) },
        )
}
