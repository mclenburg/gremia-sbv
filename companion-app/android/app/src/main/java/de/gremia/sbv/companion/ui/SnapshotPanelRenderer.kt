package de.gremia.sbv.companion.ui

import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileCaseProjection
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult

class SnapshotPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun renderImport(
        onScanFrame: () -> Unit,
        onAcceptFrame: (String) -> MobileSnapshotIntakeResult,
        onResetFrames: () -> Unit,
    ): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.snapshot_receive_kicker)))
            addView(ui.sectionTitle(context.getString(R.string.snapshot_receive_title)))
            addView(ui.paragraph(context.getString(R.string.snapshot_receive_description)))

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
            addView(ui.fieldLabel(context.getString(R.string.snapshot_cases_label)))
            addView(filterableCaseList(snapshot.cases))
        }

    private fun frameInput(): EditText =
        EditText(context).apply {
            hint = context.getString(R.string.snapshot_frame_hint)
            contentDescription = context.getString(R.string.snapshot_frame_label)
            minLines = 3
            setSingleLine(false)
            setTextColor(ui.color(R.color.gremia_text_primary))
            setHintTextColor(ui.color(R.color.gremia_text_secondary))
            val padding = ui.dimen(R.dimen.space_md)
            setPadding(padding, padding, padding, padding)
            background = ui.valueBackground()
        }

    private fun filterableCaseList(cases: List<MobileCaseProjection>): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val caseList = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
            fun renderCases(filter: String) {
                caseList.removeAllViews()
                cases
                    .filter { record -> caseMatches(record, filter) }
                    .forEach { record -> caseList.addView(caseRow(record)) }
            }
            if (cases.size > FILTER_THRESHOLD) addView(caseFilterInput(::renderCases))
            renderCases("")
            addView(caseList)
        }

    private fun caseFilterInput(onFilterChanged: (String) -> Unit): EditText =
        EditText(context).apply {
            hint = context.getString(R.string.snapshot_case_filter_hint)
            contentDescription = context.getString(R.string.snapshot_case_filter_label)
            setSingleLine(true)
            setTextColor(ui.color(R.color.gremia_text_primary))
            setHintTextColor(ui.color(R.color.gremia_text_secondary))
            val padding = ui.dimen(R.dimen.space_md)
            setPadding(padding, padding, padding, padding)
            background = ui.valueBackground()
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(text: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(text: CharSequence?, start: Int, before: Int, count: Int) {
                    onFilterChanged(text?.toString().orEmpty())
                }
                override fun afterTextChanged(editable: Editable?) = Unit
            })
        }

    private fun caseRow(record: MobileCaseProjection): TextView =
        TextView(context).apply {
            text = "${record.caseNumber}\n${record.displayName} · ${record.category} · ${record.status}"
            setTextColor(ui.color(R.color.gremia_text_primary))
            textSize = 15f
            val padding = ui.dimen(R.dimen.space_md)
            setPadding(padding, padding, padding, padding)
            background = ui.valueBackground()
        }

    private fun caseMatches(record: MobileCaseProjection, filter: String): Boolean {
        val normalized = filter.trim().lowercase()
        if (normalized.isEmpty()) return true
        return listOf(record.caseNumber, record.displayName, record.category, record.status)
            .any { value -> value.lowercase().contains(normalized) }
    }

    private companion object {
        private const val FILTER_THRESHOLD = 5
    }
}
