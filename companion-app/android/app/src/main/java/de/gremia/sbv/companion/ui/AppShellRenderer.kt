package de.gremia.sbv.companion.ui

import android.content.Context
import android.view.View
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotImportPreview
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.mobile.MobileSyncEvent
import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import de.gremia.sbv.companion.domain.security.MobileThemeMode
import de.gremia.sbv.companion.domain.security.MobileAppSettings
import de.gremia.sbv.companion.domain.security.MobileAutoLockTimeout

class AppShellRenderer(
    private val context: Context,
    themeMode: MobileThemeMode,
) {
    private val ui = GremiaUi(context, themeMode)
    private val dashboardPanel = DashboardPanelRenderer(context, ui)
    private val snapshotPanel = SnapshotPanelRenderer(context, ui)
    private val capturePanel = CapturePanelRenderer(context, ui)
    private val returnPanel = ReturnPanelRenderer(context, ui)
    private val settingsPanel = SettingsPanelRenderer(context, ui)
    private val syncHistoryPanel = SyncHistoryPanelRenderer(context, ui)

    fun render(
        identity: TransferIdentity,
        snapshot: MobileSnapshot?,
        pendingImport: MobileSnapshotImportPreview?,
        returnDrafts: MobileReturnDraftSet,
        syncEvents: List<MobileSyncEvent>,
        settings: MobileAppSettings,
        activeSection: MobileAppSection,
        onSelectSection: (MobileAppSection) -> Unit,
        renderPairing: (GremiaUi) -> View,
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
        onConfirmImport: () -> MobileSnapshotIntakeResult,
        onCancelImport: () -> MobileSnapshotIntakeResult,
        onAddReturnNote: (String, String, String, String, String?) -> Unit,
        onAddReturnInbox: (String, String, String?) -> Unit,
        onAddReturnDeadline: (String, String, String, String?, String) -> Unit,
        onCompleteReturnDeadline: (MobileDeadlineProjection, String?) -> Unit,
        onCreateReturnPackage: () -> Unit,
        onDiscardReturnDraft: (String) -> Unit,
        onClearReturnDrafts: () -> Unit,
        onSetAutoLockTimeout: (MobileAutoLockTimeout) -> Unit,
        onSetSecureScreen: (Boolean) -> Unit,
        onClearWorkData: () -> Unit,
        onInitializeNewDevice: () -> Unit,
        onExportDiagnostics: () -> Unit,
    ): ScrollView =
        ScrollView(context).apply {
            setBackgroundColor(ui.backgroundColor())
            addView(content(
                identity,
                snapshot,
                pendingImport,
                returnDrafts,
                syncEvents,
                settings,
                activeSection,
                onSelectSection,
                renderPairing,
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
                onDiscardReturnDraft,
                onClearReturnDrafts,
                onSetAutoLockTimeout,
                onSetSecureScreen,
                onClearWorkData,
                onInitializeNewDevice,
                onExportDiagnostics,
            ))
        }

    private fun content(
        identity: TransferIdentity,
        snapshot: MobileSnapshot?,
        pendingImport: MobileSnapshotImportPreview?,
        returnDrafts: MobileReturnDraftSet,
        syncEvents: List<MobileSyncEvent>,
        settings: MobileAppSettings,
        activeSection: MobileAppSection,
        onSelectSection: (MobileAppSection) -> Unit,
        renderPairing: (GremiaUi) -> View,
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
        onConfirmImport: () -> MobileSnapshotIntakeResult,
        onCancelImport: () -> MobileSnapshotIntakeResult,
        onAddReturnNote: (String, String, String, String, String?) -> Unit,
        onAddReturnInbox: (String, String, String?) -> Unit,
        onAddReturnDeadline: (String, String, String, String?, String) -> Unit,
        onCompleteReturnDeadline: (MobileDeadlineProjection, String?) -> Unit,
        onCreateReturnPackage: () -> Unit,
        onDiscardReturnDraft: (String) -> Unit,
        onClearReturnDrafts: () -> Unit,
        onSetAutoLockTimeout: (MobileAutoLockTimeout) -> Unit,
        onSetSecureScreen: (Boolean) -> Unit,
        onClearWorkData: () -> Unit,
        onInitializeNewDevice: () -> Unit,
        onExportDiagnostics: () -> Unit,
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
                MobileAppSection.Dashboard -> addView(dashboardPanel.render(snapshot, returnDrafts, syncEvents))
                MobileAppSection.Deadlines -> addView(snapshotPanel.renderCurrent(
                    snapshot,
                    returnDrafts,
                    onCompleteReturnDeadline,
                ))
                MobileAppSection.Synchronization -> {
                    addView(renderPairing(ui))
                    addView(snapshotPanel.renderImport(
                        pendingImport,
                        onScanFrame,
                        onAcceptFrame,
                        onResetFrames,
                        onConfirmImport,
                        onCancelImport,
                    ))
                    addView(returnPanel.render(
                        snapshot,
                        returnDrafts,
                        onCreateReturnPackage,
                        onDiscardReturnDraft,
                        onClearReturnDrafts,
                    ))
                    addView(syncHistoryPanel.render(syncEvents))
                }
                MobileAppSection.Capture -> addView(capturePanel.render(
                    snapshot,
                    onAddReturnNote,
                    onAddReturnInbox,
                    onAddReturnDeadline,
                ))
                MobileAppSection.Settings -> addView(settingsPanel.render(
                    identity,
                    snapshot,
                    settings,
                    onSetAutoLockTimeout,
                    onSetSecureScreen,
                    onClearWorkData,
                    onInitializeNewDevice,
                    onExportDiagnostics,
                ))
            }
        }

    private fun sectionNavigation(
        activeSection: MobileAppSection,
        onSelectSection: (MobileAppSection) -> Unit,
    ): LinearLayout =
        ui.horizontalActions(
            ui.navigationButton(
                context.getString(R.string.app_section_dashboard),
                activeSection == MobileAppSection.Dashboard,
            ) { onSelectSection(MobileAppSection.Dashboard) },
            ui.navigationButton(
                context.getString(R.string.app_section_deadlines),
                activeSection == MobileAppSection.Deadlines,
            ) { onSelectSection(MobileAppSection.Deadlines) },
            ui.navigationButton(
                context.getString(R.string.app_section_capture),
                activeSection == MobileAppSection.Capture,
            ) { onSelectSection(MobileAppSection.Capture) },
            ui.navigationButton(
                context.getString(R.string.app_section_sync),
                activeSection == MobileAppSection.Synchronization,
            ) { onSelectSection(MobileAppSection.Synchronization) },
            ui.navigationButton(
                context.getString(R.string.app_section_settings),
                activeSection == MobileAppSection.Settings,
            ) { onSelectSection(MobileAppSection.Settings) },
        )
}
