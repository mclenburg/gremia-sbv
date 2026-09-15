package de.gremia.sbv.companion.ui

import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.widget.EditText
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileCaseProjection
import de.gremia.sbv.companion.domain.mobile.MobileCaseWorkItem
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.mobile.MobileWorkProjectionBuilder

class SnapshotPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    private val workProjectionBuilder = MobileWorkProjectionBuilder()

    fun renderImport(
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
    ): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.snapshot_receive_kicker)))
            addView(ui.sectionTitle(context.getString(R.string.snapshot_receive_title)))

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

    fun renderCurrent(snapshot: MobileSnapshot?): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.snapshot_current_kicker)))
            addView(ui.sectionTitle(context.getString(R.string.snapshot_current_title)))
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
            val workProjection = workProjectionBuilder.build(snapshot)
            addView(ui.fieldLabel(context.getString(R.string.snapshot_cases_label)))
            addView(filterableCaseList(workProjection.cases))
            if (workProjection.unassignedDeadlines.isNotEmpty()) {
                addView(ui.fieldLabel(context.getString(R.string.snapshot_unassigned_deadlines_label)))
                workProjection.unassignedDeadlines.forEach { deadline -> addView(deadlineRow(deadline)) }
            }
        }

    private fun frameInput(): EditText =
        ui.textInput(
            context.getString(R.string.snapshot_frame_label),
            context.getString(R.string.snapshot_frame_hint),
            multiLine = true,
        ).apply {
            minLines = 3
        }

    private fun filterableCaseList(cases: List<MobileCaseWorkItem>): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val caseList = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
            fun renderCases(filter: String) {
                caseList.removeAllViews()
                val filteredCases = cases.filter { item -> caseMatches(item, filter) }
                if (filteredCases.isEmpty()) {
                    caseList.addView(ui.paragraph(context.getString(R.string.snapshot_cases_filter_empty)))
                    return
                }
                filteredCases.forEach { item ->
                    caseList.addView(caseRow(item))
                    if (item.openDeadlines.isEmpty()) {
                        caseList.addView(ui.listText(context.getString(R.string.snapshot_case_no_deadline)))
                    } else {
                        item.openDeadlines.forEach { deadline -> caseList.addView(deadlineRow(deadline)) }
                    }
                }
            }
            if (cases.size > FILTER_THRESHOLD) addView(caseFilterInput(::renderCases))
            renderCases("")
            addView(caseList)
        }

    private fun caseFilterInput(onFilterChanged: (String) -> Unit): EditText =
        ui.textInput(
            context.getString(R.string.snapshot_case_filter_label),
            context.getString(R.string.snapshot_case_filter_hint),
        ).apply {
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(text: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(text: CharSequence?, start: Int, before: Int, count: Int) {
                    onFilterChanged(text?.toString().orEmpty())
                }
                override fun afterTextChanged(editable: Editable?) = Unit
            })
        }

    private fun caseRow(item: MobileCaseWorkItem) =
        ui.listItem(
            primary = item.caseRecord.caseNumber,
            secondary = context.getString(
                R.string.snapshot_case_summary,
                item.caseRecord.displayName,
                item.caseRecord.category,
                item.caseRecord.status,
                item.openDeadlines.size,
            ),
            label = "${item.caseRecord.caseNumber}, ${item.caseRecord.displayName}, ${item.caseRecord.category}, ${item.caseRecord.status}",
        )

    private fun deadlineRow(deadline: MobileDeadlineProjection) =
        ui.listText(context.getString(
            R.string.snapshot_deadline_summary,
            deadline.title,
            MobileDateFormatter.formatDateTime(deadline.dueAt),
            deadline.severity,
            deadline.legalBasis ?: context.getString(R.string.snapshot_deadline_without_legal_basis),
        ))

    private fun caseMatches(item: MobileCaseWorkItem, filter: String): Boolean {
        val normalized = filter.trim().lowercase()
        if (normalized.isEmpty()) return true
        val caseValues = listOf(
            item.caseRecord.caseNumber,
            item.caseRecord.displayName,
            item.caseRecord.category,
            item.caseRecord.status,
            item.caseRecord.priority,
        )
        val deadlineValues = item.openDeadlines.flatMap { deadline ->
            listOf(deadline.title, deadline.dueAt, deadline.severity, deadline.status)
        }
        return (caseValues + deadlineValues)
            .any { value -> value.lowercase().contains(normalized) }
    }

    private companion object {
        private const val FILTER_THRESHOLD = 5
    }
}
