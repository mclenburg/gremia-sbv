package de.gremia.sbv.companion.ui

import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileCaseProjection
import de.gremia.sbv.companion.domain.mobile.MobileCaseProjectionSearch
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot

class ReturnPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    private val caseSearch = MobileCaseProjectionSearch()

    fun render(
        snapshot: MobileSnapshot?,
        drafts: MobileReturnDraftSet,
        onAddNote: (String, String, String) -> Unit,
        onAddDeadline: (String, String, String, String?, String) -> Unit,
        onCompleteDeadline: (MobileDeadlineProjection, String?) -> Unit,
        onCreatePackage: () -> Unit,
        onClearDrafts: () -> Unit,
    ): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.return_kicker)))
            addView(ui.sectionHeader(
                context.getString(R.string.return_title),
                context.getString(R.string.return_description),
            ))
            if (snapshot == null) {
                addView(ui.paragraph(context.getString(R.string.return_empty)))
                return@apply
            }
            val selectedCase = SelectedCaseState(snapshot.cases.firstOrNull()?.id.orEmpty())
            addView(caseSelector(snapshot.cases, selectedCase))
            addView(ui.responsiveColumns(
                noteForm(selectedCase, onAddNote),
                deadlineForm(selectedCase, onAddDeadline),
            ))
            addView(deadlineCompletionList(snapshot.deadlines, drafts, onCompleteDeadline))
            addView(draftList(drafts))
            addView(ui.horizontalActions(
                ui.button(context.getString(R.string.return_create_package), onCreatePackage),
                ui.button(context.getString(R.string.return_clear_drafts), onClearDrafts),
            ))
        }

    private fun caseSelector(cases: List<MobileCaseProjection>, selectedCase: SelectedCaseState): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(ui.fieldLabel(context.getString(R.string.return_case_label)))
            val selectedLabel = selectedCaseLabel(selectedCase.id, cases)
            addView(selectedLabel)
            val caseList = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
            fun renderCases(filter: String) {
                caseList.removeAllViews()
                val result = caseSearch.filter(cases, filter)
                if (result.matches.isEmpty()) {
                    caseList.addView(ui.paragraph(context.getString(R.string.return_case_filter_empty)))
                    return
                }
                if (result.hiddenMatchCount > 0) {
                    caseList.addView(ui.listText(context.getString(
                        R.string.return_case_filter_limited,
                        result.matches.size,
                        result.totalMatchCount,
                    )))
                }
                result.matches.forEach { record ->
                    caseList.addView(ui.button(context.getString(
                        R.string.return_case_select_button,
                        record.caseNumber,
                        record.displayName,
                    )) {
                        selectedCase.id = record.id
                        selectedLabel.text = selectedCaseText(record.id, cases)
                        selectedLabel.contentDescription = selectedLabel.text
                    })
                }
            }
            if (cases.size > FILTER_THRESHOLD) addView(caseFilterInput(::renderCases))
            renderCases("")
            addView(caseList)
        }

    private fun selectedCaseLabel(caseId: String, cases: List<MobileCaseProjection>): TextView =
        ui.listText(selectedCaseText(caseId, cases), selectedCaseText(caseId, cases))

    private fun selectedCaseText(caseId: String, cases: List<MobileCaseProjection>): String {
        val record = cases.firstOrNull { item -> item.id == caseId }
            ?: return context.getString(R.string.return_no_case_selected)
        return context.getString(R.string.return_selected_case, record.caseNumber, record.displayName)
    }

    private fun noteForm(selectedCase: SelectedCaseState, onAddNote: (String, String, String) -> Unit): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val title = textInput(R.string.return_note_title_label, R.string.return_note_title_hint, false)
            val content = textInput(R.string.return_note_content_label, R.string.return_note_content_hint, true)
            addView(ui.fieldLabel(context.getString(R.string.return_note_title_label)))
            addView(title)
            addView(ui.fieldLabel(context.getString(R.string.return_note_content_label)))
            addView(content)
            addView(ui.button(context.getString(R.string.return_note_add)) {
                onAddNote(selectedCase.id, title.text.toString(), content.text.toString())
                title.text.clear()
                content.text.clear()
            })
        }

    private fun deadlineForm(
        selectedCase: SelectedCaseState,
        onAddDeadline: (String, String, String, String?, String) -> Unit,
    ): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val title = textInput(R.string.return_deadline_title_label, R.string.return_deadline_title_hint, false)
            val dueAt = textInput(R.string.return_deadline_due_label, R.string.return_deadline_due_hint, false)
            val severity = textInput(R.string.return_deadline_severity_label, R.string.return_deadline_severity_hint, false)
            val description = textInput(R.string.return_deadline_description_label, R.string.return_deadline_description_hint, true)
            addView(ui.fieldLabel(context.getString(R.string.return_deadline_title_label)))
            addView(title)
            addView(ui.fieldLabel(context.getString(R.string.return_deadline_due_label)))
            addView(dueAt)
            addView(ui.fieldLabel(context.getString(R.string.return_deadline_severity_label)))
            addView(severity)
            addView(ui.fieldLabel(context.getString(R.string.return_deadline_description_label)))
            addView(description)
            addView(ui.button(context.getString(R.string.return_deadline_add)) {
                onAddDeadline(
                    selectedCase.id,
                    title.text.toString(),
                    dueAt.text.toString(),
                    description.text.toString(),
                    severity.text.toString(),
                )
                title.text.clear()
                dueAt.text.clear()
                severity.text.clear()
                description.text.clear()
            })
        }

    private fun deadlineCompletionList(
        deadlines: List<MobileDeadlineProjection>,
        drafts: MobileReturnDraftSet,
        onCompleteDeadline: (MobileDeadlineProjection, String?) -> Unit,
    ): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val completionIds = drafts.deadlineCompletions.map { completion -> completion.deadlineId }.toSet()
            val openDeadlines = deadlines.filter { deadline -> deadline.status != "done" && deadline.status != "completed" }
            addView(ui.fieldLabel(context.getString(R.string.return_deadline_complete_label)))
            if (openDeadlines.isEmpty()) {
                addView(ui.listText(context.getString(R.string.return_deadline_complete_empty)))
                return@apply
            }
            openDeadlines.forEach { deadline ->
                addView(ui.listItem(
                    primary = deadline.title,
                    secondary = context.getString(
                        R.string.return_deadline_complete_summary,
                        MobileDateFormatter.formatDateTime(deadline.dueAt),
                        deadline.severity,
                    ),
                ))
                val note = textInput(
                    R.string.return_deadline_complete_note_label,
                    R.string.return_deadline_complete_note_hint,
                    multiLine = false,
                )
                addView(note)
                val label = if (completionIds.contains(deadline.id)) {
                    context.getString(R.string.return_deadline_complete_planned)
                } else {
                    context.getString(R.string.return_deadline_complete_action)
                }
                addView(ui.button(label) {
                    if (!completionIds.contains(deadline.id)) {
                        onCompleteDeadline(deadline, note.text.toString())
                    }
                })
            }
        }

    private fun draftList(drafts: MobileReturnDraftSet): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(ui.paragraph(context.getString(R.string.return_draft_summary, drafts.changeCount)))
            drafts.notes.forEach { note ->
                addView(ui.listText(context.getString(R.string.return_note_draft_entry, note.title)))
            }
            drafts.deadlines.forEach { deadline ->
                addView(ui.listText(context.getString(R.string.return_deadline_draft_entry, deadline.title)))
            }
            drafts.deadlineCompletions.forEach { completion ->
                addView(ui.listText(context.getString(R.string.return_deadline_completion_draft_entry, completion.deadlineId)))
            }
        }

    private fun caseFilterInput(onFilterChanged: (String) -> Unit): EditText =
        textInput(R.string.return_case_filter_label, R.string.return_case_filter_hint, false).apply {
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(text: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(text: CharSequence?, start: Int, before: Int, count: Int) {
                    onFilterChanged(text?.toString().orEmpty())
                }
                override fun afterTextChanged(editable: Editable?) = Unit
            })
        }

    private fun textInput(labelId: Int, hintId: Int, multiLine: Boolean): EditText =
        ui.textInput(context.getString(labelId), context.getString(hintId), multiLine)

    private data class SelectedCaseState(var id: String)

    private companion object {
        private const val FILTER_THRESHOLD = 5
    }
}
