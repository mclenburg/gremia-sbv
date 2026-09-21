package de.gremia.sbv.companion.ui

import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.widget.EditText
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineDisplayStatus
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineMonitor
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineWorkItem
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineWorklistBuilder
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineWorklistSearch
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotImportPreview
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection

class SnapshotPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    private val deadlineWorklistBuilder = MobileDeadlineWorklistBuilder()
    private val deadlineSearch = MobileDeadlineWorklistSearch()
    private val deadlineMonitor = MobileDeadlineMonitor()

    fun renderImport(
        pendingImport: MobileSnapshotImportPreview?,
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
        onConfirmImport: () -> MobileSnapshotIntakeResult,
        onCancelImport: () -> MobileSnapshotIntakeResult,
    ): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.snapshot_receive_kicker)))
            addView(ui.sectionHeader(
                context.getString(R.string.snapshot_receive_title),
                context.getString(R.string.snapshot_receive_description),
            ))

            if (pendingImport != null) {
                addView(importPreview(pendingImport))
                val status = ui.paragraph(context.getString(R.string.snapshot_import_ready))
                addView(status)
                addView(ui.horizontalActions(
                    ui.button(context.getString(R.string.snapshot_import_confirm)) {
                        status.text = onConfirmImport().message
                    },
                    ui.button(context.getString(R.string.snapshot_import_cancel)) {
                        status.text = onCancelImport().message
                    },
                ))
                return@apply
            }

            val input = frameInput()
            val status = ui.paragraph(context.getString(R.string.snapshot_frame_empty))
            addView(input)
            addView(status)
            addView(ui.horizontalActions(
                ui.button(context.getString(R.string.snapshot_frame_scan), onScanFrame),
                ui.button(context.getString(R.string.snapshot_frame_accept)) {
                    val result = onAcceptFrame(input.text.toString())
                    status.text = result.message
                    if (result !is MobileSnapshotIntakeResult.Error) input.text.clear()
                },
                ui.button(context.getString(R.string.snapshot_frames_reset)) {
                    onResetFrames()
                    status.text = context.getString(R.string.snapshot_frame_empty)
                },
            ))
        }

    private fun importPreview(preview: MobileSnapshotImportPreview) =
        ui.listItem(
            primary = context.getString(R.string.snapshot_import_preview_title),
            secondary = context.getString(
                R.string.snapshot_import_preview_summary,
                preview.caseCount,
                preview.deadlineCount,
                preview.sourceInstanceId,
                preview.packageId,
            ),
            label = context.getString(R.string.snapshot_import_preview_title),
        )

    fun renderCurrent(
        snapshot: MobileSnapshot?,
        drafts: MobileReturnDraftSet,
        onCompleteDeadline: (MobileDeadlineProjection, String?) -> Unit,
    ): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.snapshot_current_kicker)))
            addView(ui.sectionHeader(
                context.getString(R.string.snapshot_current_title),
                context.getString(R.string.snapshot_current_help),
            ))
            if (snapshot == null) {
                addView(ui.paragraph(context.getString(R.string.snapshot_current_empty)))
                return@apply
            }

            addView(ui.paragraph(context.getString(
                R.string.snapshot_current_summary,
                snapshot.cases.size,
                snapshot.deadlines.size,
                snapshot.sourceInstanceId,
            )))
            val summary = deadlineMonitor.summarize(snapshot)
            addView(ui.listItem(
                primary = context.getString(R.string.snapshot_deadline_monitor_label),
                secondary = context.getString(
                    R.string.snapshot_deadline_monitor_summary,
                    summary.totalOpen,
                    summary.overdue,
                    summary.dueToday,
                    summary.critical,
                    summary.nextSevenDays,
                ),
            ))
            val deadlineWorklist = deadlineWorklistBuilder.build(snapshot)
            addView(ui.fieldLabel(context.getString(R.string.snapshot_deadlines_label)))
            addView(filterableDeadlineList(deadlineWorklist.items, drafts, onCompleteDeadline))
        }

    private fun frameInput(): EditText =
        ui.textInput(
            context.getString(R.string.snapshot_frame_label),
            context.getString(R.string.snapshot_frame_hint),
            multiLine = true,
        ).apply {
            minLines = 3
        }

    private fun filterableDeadlineList(
        deadlines: List<MobileDeadlineWorkItem>,
        drafts: MobileReturnDraftSet,
        onCompleteDeadline: (MobileDeadlineProjection, String?) -> Unit,
    ): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val deadlineList = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
            val completionIds = drafts.deadlineCompletions.map { completion -> completion.deadlineId }.toSet()
            fun renderDeadlines(filter: String) {
                deadlineList.removeAllViews()
                val result = deadlineSearch.filter(deadlines, filter)
                if (result.matches.isEmpty()) {
                    deadlineList.addView(ui.paragraph(context.getString(R.string.snapshot_deadlines_filter_empty)))
                    return
                }
                if (result.hiddenMatchCount > 0) {
                    deadlineList.addView(ui.listText(context.getString(
                        R.string.snapshot_deadlines_filter_limited,
                        result.matches.size,
                        result.totalMatchCount,
                    )))
                }
                result.matches.forEach { item ->
                    deadlineList.addView(deadlineWorkItemRow(item, completionIds, onCompleteDeadline))
                }
            }
            if (deadlines.size > FILTER_THRESHOLD) addView(deadlineFilterInput(::renderDeadlines))
            renderDeadlines("")
            addView(deadlineList)
        }

    private fun deadlineFilterInput(onFilterChanged: (String) -> Unit): EditText =
        ui.textInput(
            context.getString(R.string.snapshot_deadline_filter_label),
            context.getString(R.string.snapshot_deadline_filter_hint),
        ).apply {
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(text: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(text: CharSequence?, start: Int, before: Int, count: Int) {
                    onFilterChanged(text?.toString().orEmpty())
                }
                override fun afterTextChanged(editable: Editable?) = Unit
            })
        }

    private fun deadlineWorkItemRow(
        item: MobileDeadlineWorkItem,
        completionIds: Set<String>,
        onCompleteDeadline: (MobileDeadlineProjection, String?) -> Unit,
    ): LinearLayout {
        val summary = context.getString(
                R.string.snapshot_deadline_work_item_summary,
                deadlineStatusLabel(item.displayStatus),
                MobileDateFormatter.formatDateTime(item.deadline.dueAt),
                deadlineCaseLabel(item),
                item.deadline.legalBasis ?: context.getString(R.string.snapshot_deadline_without_legal_basis),
        )
        if (completionIds.contains(item.deadline.id)) {
            return LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                addView(ui.listItem(
                    item.deadline.title,
                    "$summary · ${context.getString(R.string.return_deadline_complete_planned)}",
                ))
            }
        }
        return ui.actionListItem(
            primary = item.deadline.title,
            secondary = summary,
            actionLabel = context.getString(R.string.return_deadline_complete_action),
        ) {
            ui.promptForOptionalText(
                title = item.deadline.title,
                label = context.getString(R.string.return_deadline_complete_note_label),
                hint = context.getString(R.string.return_deadline_complete_note_hint),
                confirmLabel = context.getString(R.string.return_deadline_complete_action),
            ) { note -> onCompleteDeadline(item.deadline, note) }
        }
    }

    private fun deadlineCaseLabel(item: MobileDeadlineWorkItem): String =
        item.caseRecord?.let { record ->
            context.getString(
                R.string.snapshot_deadline_case_reference,
                record.caseNumber,
                record.displayName,
            )
        } ?: context.getString(R.string.snapshot_deadline_case_unassigned)

    private fun deadlineStatusLabel(status: MobileDeadlineDisplayStatus): String =
        when (status) {
            MobileDeadlineDisplayStatus.Overdue -> context.getString(R.string.snapshot_deadline_status_overdue)
            MobileDeadlineDisplayStatus.DueToday -> context.getString(R.string.snapshot_deadline_status_today)
            MobileDeadlineDisplayStatus.Critical -> context.getString(R.string.snapshot_deadline_status_critical)
            MobileDeadlineDisplayStatus.Open -> context.getString(R.string.snapshot_deadline_status_open)
        }

    private companion object {
        private const val FILTER_THRESHOLD = 5
    }
}
