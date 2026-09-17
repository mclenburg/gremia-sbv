package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileSyncDirection
import de.gremia.sbv.companion.domain.mobile.MobileSyncEvent

class SyncHistoryPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun render(events: List<MobileSyncEvent>): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.sync_history_kicker)))
            addView(ui.sectionHeader(
                context.getString(R.string.sync_history_title),
                context.getString(R.string.sync_history_help),
            ))
            if (events.isEmpty()) {
                addView(ui.paragraph(context.getString(R.string.sync_history_empty)))
                return@apply
            }
            events.forEach { event ->
                addView(ui.listItem(
                    primary = context.getString(
                        if (event.direction == MobileSyncDirection.DesktopToMobile) {
                            R.string.sync_history_import
                        } else {
                            R.string.sync_history_export
                        },
                        MobileDateFormatter.formatDateTime(event.occurredAt),
                    ),
                    secondary = eventSummary(event),
                ))
            }
        }

    private fun eventSummary(event: MobileSyncEvent): String =
        if (event.direction == MobileSyncDirection.DesktopToMobile) {
            context.getString(
                R.string.sync_history_import_summary,
                event.caseCount,
                event.deadlineCount,
                event.packageId,
            )
        } else {
            context.getString(R.string.sync_history_export_summary, event.changeCount, event.packageId)
        }
}
