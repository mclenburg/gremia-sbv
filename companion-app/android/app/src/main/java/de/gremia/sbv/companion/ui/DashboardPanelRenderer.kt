package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileDashboardBuilder
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot

class DashboardPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
    private val dashboardBuilder: MobileDashboardBuilder = MobileDashboardBuilder(),
) {
    fun render(snapshot: MobileSnapshot?, drafts: MobileReturnDraftSet): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.dashboard_kicker)))
            addView(ui.sectionHeader(
                context.getString(R.string.dashboard_title),
                context.getString(R.string.dashboard_help),
            ))
            val summary = dashboardBuilder.build(snapshot, drafts)
            addView(ui.responsiveColumns(
                ui.summaryCard(
                    context.getString(R.string.dashboard_due_today),
                    summary.dueToday.toString(),
                    context.getString(R.string.dashboard_due_today_detail),
                ),
                ui.summaryCard(
                    context.getString(R.string.dashboard_next_seven_days),
                    summary.nextSevenDays.toString(),
                    context.getString(R.string.dashboard_next_seven_days_detail),
                ),
            ))
            addView(ui.responsiveColumns(
                ui.summaryCard(
                    context.getString(R.string.dashboard_overdue),
                    summary.overdue.toString(),
                    context.getString(R.string.dashboard_overdue_detail),
                ),
                ui.summaryCard(
                    context.getString(R.string.dashboard_unsent_changes),
                    summary.unsentChanges.toString(),
                    context.getString(R.string.dashboard_unsent_changes_detail),
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
            addView(ui.listItem(
                primary = summary.lastSnapshotAt?.let(MobileDateFormatter::formatDateTime)
                    ?: context.getString(R.string.dashboard_no_sync),
                secondary = summary.lastSnapshotPackageId?.let { packageId ->
                    context.getString(R.string.dashboard_last_sync_package, packageId)
                },
            ))
        }
}
