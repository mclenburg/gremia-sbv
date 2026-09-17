package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot

class ReturnPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun render(
        snapshot: MobileSnapshot?,
        drafts: MobileReturnDraftSet,
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
            addView(deadlineCompletionList(snapshot.deadlines, drafts, onCompleteDeadline))
            addView(draftList(drafts))
            addView(ui.horizontalActions(
                ui.button(context.getString(R.string.return_create_package), onCreatePackage),
                ui.button(context.getString(R.string.return_clear_drafts), onClearDrafts),
            ))
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
            drafts.inboxEntries.forEach { entry ->
                addView(ui.listText(context.getString(R.string.return_inbox_draft_entry, entry.title)))
            }
        }

    private fun textInput(labelId: Int, hintId: Int, multiLine: Boolean) =
        ui.textInput(context.getString(labelId), context.getString(hintId), multiLine)
}
