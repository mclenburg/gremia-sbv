package de.gremia.sbv.companion.ui

import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.widget.EditText
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileCaseProjection
import de.gremia.sbv.companion.domain.mobile.MobileReturnNoteDraft
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot

class ReturnPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun render(
        snapshot: MobileSnapshot?,
        notes: List<MobileReturnNoteDraft>,
        onAddNote: (String, String, String) -> Unit,
        onCreatePackage: () -> Unit,
        onClearNotes: () -> Unit,
    ): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.return_kicker)))
            addView(ui.sectionTitle(context.getString(R.string.return_title)))
            if (snapshot == null) {
                addView(ui.paragraph(context.getString(R.string.return_empty)))
                return@apply
            }
            addView(ui.paragraph(context.getString(R.string.return_description)))
            addView(noteForm(snapshot.cases, onAddNote))
            addView(draftList(notes))
            addView(ui.horizontalActions(
                ui.button(context.getString(R.string.return_create_package), onCreatePackage),
                ui.button(context.getString(R.string.return_clear_drafts), onClearNotes),
            ))
        }

    private fun noteForm(cases: List<MobileCaseProjection>, onAddNote: (String, String, String) -> Unit): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            var selectedCaseId = cases.firstOrNull()?.id.orEmpty()
            addView(ui.fieldLabel(context.getString(R.string.return_case_label)))
            val caseList = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
            fun renderCases(filter: String) {
                caseList.removeAllViews()
                cases.filter { caseMatches(it, filter) }.forEach { record ->
                    caseList.addView(ui.button(context.getString(
                        R.string.return_case_select_button,
                        record.caseNumber,
                        record.displayName,
                    )) {
                        selectedCaseId = record.id
                    })
                }
            }
            if (cases.size > FILTER_THRESHOLD) addView(caseFilterInput(::renderCases))
            renderCases("")
            addView(caseList)
            val title = textInput(R.string.return_note_title_label, R.string.return_note_title_hint, false)
            val content = textInput(R.string.return_note_content_label, R.string.return_note_content_hint, true)
            addView(ui.fieldLabel(context.getString(R.string.return_note_title_label)))
            addView(title)
            addView(ui.fieldLabel(context.getString(R.string.return_note_content_label)))
            addView(content)
            addView(ui.button(context.getString(R.string.return_note_add)) {
                onAddNote(selectedCaseId, title.text.toString(), content.text.toString())
                title.text.clear()
                content.text.clear()
            })
        }

    private fun draftList(notes: List<MobileReturnNoteDraft>): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(ui.paragraph(context.getString(R.string.return_draft_summary, notes.size)))
            notes.take(LIST_PREVIEW_LIMIT).forEach { note ->
                addView(ui.listText(context.getString(R.string.return_draft_entry, note.title)))
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

    private fun caseMatches(record: MobileCaseProjection, filter: String): Boolean {
        val normalized = filter.trim().lowercase()
        if (normalized.isEmpty()) return true
        return listOf(record.caseNumber, record.displayName, record.category, record.status)
            .any { value -> value.lowercase().contains(normalized) }
    }

    private companion object {
        private const val FILTER_THRESHOLD = 5
        private const val LIST_PREVIEW_LIMIT = 8
    }
}
