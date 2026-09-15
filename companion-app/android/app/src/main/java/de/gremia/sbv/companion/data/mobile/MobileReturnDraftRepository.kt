package de.gremia.sbv.companion.data.mobile

import android.content.Context
import de.gremia.sbv.companion.data.security.AndroidSecretBox
import de.gremia.sbv.companion.domain.mobile.MobileReturnNoteDraft
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

class MobileReturnDraftRepository(
    context: Context,
    private val secretBox: AndroidSecretBox = AndroidSecretBox("gremia_sbv_companion_return_drafts_v1"),
) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun listNotes(): List<MobileReturnNoteDraft> {
        val stored = preferences.getString(DRAFTS_KEY, null) ?: return emptyList()
        val items = JSONArray(secretBox.decrypt(stored))
        return List(items.length()) { index ->
            val item = items.getJSONObject(index)
            MobileReturnNoteDraft(
                mobileId = item.getString("mobileId"),
                caseId = item.getString("caseId"),
                changedAt = item.getString("changedAt"),
                title = item.getString("title"),
                content = item.getString("content"),
            )
        }
    }

    fun addNote(caseId: String, title: String, content: String): MobileReturnNoteDraft {
        val note = MobileReturnNoteDraft(
            mobileId = "mobile_note_${UUID.randomUUID()}",
            caseId = requireText(caseId, "Bitte eine Fallakte auswählen.", 160),
            changedAt = Instant.now().toString(),
            title = requireText(title, "Bitte einen Notiztitel angeben.", 180),
            content = requireText(content, "Bitte einen Notizinhalt angeben.", 20_000),
        )
        saveNotes(listNotes() + note)
        return note
    }

    fun clear() {
        preferences.edit().remove(DRAFTS_KEY).apply()
    }

    private fun saveNotes(notes: List<MobileReturnNoteDraft>) {
        require(notes.size <= MAX_DRAFTS) { "Es können höchstens $MAX_DRAFTS mobile Änderungen in einer Rückgabe gesammelt werden." }
        val items = JSONArray()
        notes.forEach { note ->
            items.put(JSONObject()
                .put("mobileId", note.mobileId)
                .put("caseId", note.caseId)
                .put("changedAt", note.changedAt)
                .put("title", note.title)
                .put("content", note.content))
        }
        preferences.edit()
            .putString(DRAFTS_KEY, secretBox.encrypt(items.toString()))
            .apply()
    }

    private fun requireText(value: String, message: String, maxLength: Int): String {
        val trimmed = value.trim()
        require(trimmed.isNotEmpty()) { message }
        require(trimmed.length <= maxLength) { "Die Eingabe ist zu lang." }
        return trimmed
    }

    private companion object {
        private const val PREFERENCES_NAME = "gremia_sbv_companion_return_drafts"
        private const val DRAFTS_KEY = "return_note_drafts_v1"
        private const val MAX_DRAFTS = 1000
    }
}
