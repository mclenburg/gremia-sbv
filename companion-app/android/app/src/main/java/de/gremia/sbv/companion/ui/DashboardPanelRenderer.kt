package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileDashboardBuilder
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSyncEvent

class DashboardPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
    private val dashboardBuilder: MobileDashboardBuilder = MobileDashboardBuilder(),
) {
    fun render(snapshot: MobileSnapshot?, drafts: MobileReturnDraftSet, syncEvents: List<MobileSyncEvent>): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.dashboard_kicker)))
            addView(ui.sectionHeader(
                context.getString(R.string.dashboard_title),
                context.getString(R.string.dashboard_help),
            ))
            val summary = dashboardBuilder.build(snapshot, drafts, syncEvents)
            addView(ui.responsiveColumns(
                ui.summaryCard(
                    context.getString(R.string.dashboard_due_today),
                    summary.dueToday.toString(),
                ),
                ui.summaryCard(
                    context.getString(R.string.dashboard_next_seven_days),
                    summary.nextSevenDays.toString(),
                ),
            ))
            addView(ui.responsiveColumns(
                ui.summaryCard(
                    context.getString(R.string.dashboard_overdue),
                    summary.overdue.toString(),
                ),
                ui.summaryCard(
                    context.getString(R.string.dashboard_critical),
                    summary.critical.toString(),
                ),
            ))
            addView(ui.responsiveColumns(
                ui.summaryCard(
                    context.getString(R.string.dashboard_open_follow_ups),
                    summary.openDeadlines.toString(),
                ),
                ui.summaryCard(
                    context.getString(R.string.dashboard_unsent_changes),
                    summary.unsentChanges.toString(),
                ),
            ))

            addView(ui.fieldLabel(context.getString(R.string.dashboard_recent_cases)))
            if (summary.recentlyEditedCases.isEmpty()) {
                addView(ui.listText(context.getString(R.string.dashboard_recent_cases_empty)))
            } else {
                summary.recentlyEditedCases.forEach { record ->
                    addView(ui.listItem(
                        primary = record.caseNumber,
                        secondary = context.getString(
                            R.string.dashboard_recent_case_summary,
                            record.displayName,
                            record.category,
                        ),
                    ))
                }
            }

            addView(ui.fieldLabel(context.getString(R.string.dashboard_last_sync)))
            addView(transferRow(context.getString(R.string.dashboard_last_import), summary.lastImport))
            addView(transferRow(context.getString(R.string.dashboard_last_export), summary.lastExport))
        }

    private fun transferRow(label: String, event: MobileSyncEvent?) =
        ui.listItem(
            primary = event?.let { item -> "$label · ${MobileDateFormatter.formatDateTime(item.occurredAt)}" }
                ?: context.getString(R.string.dashboard_no_transfer, label),
            secondary = event?.let { item -> context.getString(R.string.dashboard_last_sync_package, item.packageId) },
        )
}
