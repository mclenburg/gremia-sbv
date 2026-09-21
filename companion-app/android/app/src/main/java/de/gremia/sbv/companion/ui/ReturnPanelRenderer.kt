package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot

class ReturnPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun render(
        snapshot: MobileSnapshot?,
        drafts: MobileReturnDraftSet,
        onCreatePackage: () -> Unit,
        onDiscardDraft: (String) -> Unit,
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
            addView(draftList(drafts, onDiscardDraft))
            addView(ui.horizontalActions(
                ui.button(context.getString(R.string.return_create_package), onCreatePackage),
                ui.confirmingSecondaryButton(
                    context.getString(R.string.return_clear_drafts),
                    context.getString(R.string.return_clear_confirm_title),
                    context.getString(R.string.return_clear_confirm_message),
                    onClearDrafts,
                ),
            ))
        }

    private fun draftList(drafts: MobileReturnDraftSet, onDiscardDraft: (String) -> Unit): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(ui.paragraph(context.getString(R.string.return_draft_summary, drafts.changeCount)))
            drafts.notes.forEach { note ->
                addView(draftRow(context.getString(R.string.return_note_draft_entry, note.title), note.mobileId, onDiscardDraft))
            }
            drafts.deadlines.forEach { deadline ->
                addView(draftRow(context.getString(R.string.return_deadline_draft_entry, deadline.title), deadline.mobileId, onDiscardDraft))
            }
            drafts.deadlineCompletions.forEach { completion ->
                addView(draftRow(context.getString(R.string.return_deadline_completion_draft_entry, completion.deadlineId), completion.mobileId, onDiscardDraft))
            }
            drafts.inboxEntries.forEach { entry ->
                addView(draftRow(context.getString(R.string.return_inbox_draft_entry, entry.title), entry.mobileId, onDiscardDraft))
            }
        }

    private fun draftRow(label: String, mobileId: String, onDiscardDraft: (String) -> Unit): LinearLayout =
        ui.actionListItem(
            primary = label,
            secondary = null,
            actionLabel = context.getString(R.string.return_discard_draft),
        ) { onDiscardDraft(mobileId) }

}
