package de.gremia.sbv.companion.data.mobile

import android.annotation.SuppressLint
import android.content.Context
import de.gremia.sbv.companion.data.security.AndroidSecretBox
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection
import de.gremia.sbv.companion.domain.mobile.MobileReturnDeadlineCompletionDraft
import de.gremia.sbv.companion.domain.mobile.MobileReturnDeadlineDraft
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileReturnInboxDraft
import de.gremia.sbv.companion.domain.mobile.MobileReturnNoteDraft
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

class MobileReturnDraftRepository(
    context: Context,
    private val secretBox: AndroidSecretBox = AndroidSecretBox("gremia_sbv_companion_return_drafts_v1"),
) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun listDrafts(): MobileReturnDraftSet {
        val stored = preferences.getString(DRAFTS_KEY, null) ?: return emptyDrafts()
        val plainText = secretBox.decrypt(stored)
        if (plainText.trimStart().startsWith("[")) {
            return MobileReturnDraftSet(notesFromArray(JSONArray(plainText)), emptyList(), emptyList(), emptyList())
        }
        val state = JSONObject(plainText)
        return MobileReturnDraftSet(
            notes = notesFromArray(state.optJSONArray("notes") ?: JSONArray()),
            deadlines = deadlinesFromArray(state.optJSONArray("deadlines") ?: JSONArray()),
            deadlineCompletions = completionsFromArray(state.optJSONArray("deadlineCompletions") ?: JSONArray()),
            inboxEntries = inboxFromArray(state.optJSONArray("inboxEntries") ?: JSONArray()),
        )
    }

    fun addNote(caseId: String, title: String, content: String, noteType: String, nextSteps: String?): MobileReturnNoteDraft {
        val note = MobileReturnNoteDraft(
            mobileId = "mobile_note_${UUID.randomUUID()}",
            caseId = requireText(caseId, "Bitte eine Fallakte auswählen.", 160),
            changedAt = Instant.now().toString(),
            title = requireText(title, "Bitte einen Notiztitel angeben.", 180),
            content = requireText(content, "Bitte einen Notizinhalt angeben.", 20_000),
            noteType = normalizeNoteType(noteType),
            nextSteps = nextSteps?.trim()?.takeIf { value -> value.isNotEmpty() },
        )
        val current = listDrafts()
        saveDrafts(current.copy(notes = current.notes + note))
        return note
    }

    fun addInbox(title: String, content: String, nextSteps: String?): MobileReturnInboxDraft {
        val entry = MobileReturnInboxDraft(
            mobileId = "mobile_inbox_${UUID.randomUUID()}",
            changedAt = Instant.now().toString(),
            title = requireText(title, "Bitte einen Inbox-Titel angeben.", 180),
            content = requireText(content, "Bitte einen Inhalt angeben.", 20_000),
            nextSteps = nextSteps?.trim()?.takeIf { value -> value.isNotEmpty() },
            containsHealthData = true,
        )
        val current = listDrafts()
        saveDrafts(current.copy(inboxEntries = current.inboxEntries + entry))
        return entry
    }

    fun addDeadline(caseId: String, title: String, dueAt: String, description: String?, severity: String): MobileReturnDeadlineDraft {
        val deadline = MobileReturnDeadlineDraft(
            mobileId = "mobile_deadline_${UUID.randomUUID()}",
            caseId = requireText(caseId, "Bitte eine Fallakte auswählen.", 160),
            changedAt = Instant.now().toString(),
            title = requireText(title, "Bitte einen Fristtitel angeben.", 180),
            dueAt = requireIsoDateTime(dueAt),
            reminderAt = null,
            description = description?.trim()?.takeIf { value -> value.isNotEmpty() },
            severity = normalizeSeverity(severity),
        )
        val current = listDrafts()
        saveDrafts(current.copy(deadlines = current.deadlines + deadline))
        return deadline
    }

    fun completeDeadline(deadline: MobileDeadlineProjection, completedNote: String?): MobileReturnDeadlineCompletionDraft {
        val current = listDrafts()
        val existing = current.deadlineCompletions.firstOrNull { completion -> completion.deadlineId == deadline.id }
        if (existing != null) return existing
        val completion = MobileReturnDeadlineCompletionDraft(
            mobileId = "mobile_deadline_done_${UUID.randomUUID()}",
            deadlineId = deadline.id,
            changedAt = Instant.now().toString(),
            baseUpdatedAt = deadline.updatedAt,
            completedNote = completedNote?.trim()?.takeIf { value -> value.isNotEmpty() },
        )
        saveDrafts(current.copy(deadlineCompletions = current.deadlineCompletions + completion))
        return completion
    }

    @SuppressLint("ApplySharedPref")
    fun clear(destroyKey: Boolean = false) {
        preferences.edit().remove(DRAFTS_KEY).commit()
        if (destroyKey) secretBox.deleteKey()
    }

    fun remove(mobileId: String): Boolean {
        val current = listDrafts()
        val updated = current.without(mobileId)
        if (updated.changeCount == current.changeCount) return false
        if (updated.changeCount == 0) clear() else saveDrafts(updated)
        return true
    }

    private fun notesFromArray(items: JSONArray): List<MobileReturnNoteDraft> =
        List(items.length()) { index ->
            val item = items.getJSONObject(index)
            MobileReturnNoteDraft(
                mobileId = item.getString("mobileId"),
                caseId = item.getString("caseId"),
                changedAt = item.getString("changedAt"),
                title = item.getString("title"),
                content = item.getString("content"),
                noteType = item.optString("noteType", "gespraech"),
                nextSteps = item.optString("nextSteps").takeIf { value -> value.isNotBlank() },
            )
        }

    private fun deadlinesFromArray(items: JSONArray): List<MobileReturnDeadlineDraft> =
        List(items.length()) { index ->
            val item = items.getJSONObject(index)
            MobileReturnDeadlineDraft(
                mobileId = item.getString("mobileId"),
                caseId = item.getString("caseId"),
                changedAt = item.getString("changedAt"),
                title = item.getString("title"),
                dueAt = item.getString("dueAt"),
                reminderAt = item.optString("reminderAt").takeIf { value -> value.isNotBlank() },
                description = item.optString("description").takeIf { value -> value.isNotBlank() },
                severity = item.optString("severity", "normal"),
            )
        }

    private fun completionsFromArray(items: JSONArray): List<MobileReturnDeadlineCompletionDraft> =
        List(items.length()) { index ->
            val item = items.getJSONObject(index)
            MobileReturnDeadlineCompletionDraft(
                mobileId = item.getString("mobileId"),
                deadlineId = item.getString("deadlineId"),
                changedAt = item.getString("changedAt"),
                baseUpdatedAt = item.getString("baseUpdatedAt"),
                completedNote = item.optString("completedNote").takeIf { value -> value.isNotBlank() },
            )
        }

    private fun inboxFromArray(items: JSONArray): List<MobileReturnInboxDraft> =
        List(items.length()) { index ->
            val item = items.getJSONObject(index)
            MobileReturnInboxDraft(
                mobileId = item.getString("mobileId"),
                changedAt = item.getString("changedAt"),
                title = item.getString("title"),
                content = item.getString("content"),
                nextSteps = item.optString("nextSteps").takeIf { value -> value.isNotBlank() },
                containsHealthData = item.optBoolean("containsHealthData", true),
            )
        }

    private fun saveDrafts(drafts: MobileReturnDraftSet) {
        require(drafts.changeCount <= MAX_DRAFTS) { "Es können höchstens $MAX_DRAFTS mobile Änderungen in einer Rückgabe gesammelt werden." }
        val state = JSONObject()
            .put("notes", JSONArray().also { items ->
                drafts.notes.forEach { note ->
                    items.put(JSONObject()
                        .put("mobileId", note.mobileId)
                        .put("caseId", note.caseId)
                        .put("changedAt", note.changedAt)
                        .put("title", note.title)
                        .put("content", note.content)
                        .put("noteType", note.noteType)
                        .apply {
                            note.nextSteps?.let { value -> put("nextSteps", value) }
                        })
                }
            })
            .put("deadlines", JSONArray().also { items ->
                drafts.deadlines.forEach { deadline ->
                    items.put(JSONObject()
                        .put("mobileId", deadline.mobileId)
                        .put("caseId", deadline.caseId)
                        .put("changedAt", deadline.changedAt)
                        .put("title", deadline.title)
                        .put("dueAt", deadline.dueAt)
                        .put("severity", deadline.severity)
                        .apply {
                            deadline.reminderAt?.let { value -> put("reminderAt", value) }
                            deadline.description?.let { value -> put("description", value) }
                        })
                }
            })
            .put("deadlineCompletions", JSONArray().also { items ->
                drafts.deadlineCompletions.forEach { completion ->
                    items.put(JSONObject()
                        .put("mobileId", completion.mobileId)
                        .put("deadlineId", completion.deadlineId)
                        .put("changedAt", completion.changedAt)
                        .put("baseUpdatedAt", completion.baseUpdatedAt)
                        .apply {
                            completion.completedNote?.let { value -> put("completedNote", value) }
                        })
                }
            })
            .put("inboxEntries", JSONArray().also { items ->
                drafts.inboxEntries.forEach { entry ->
                    items.put(JSONObject()
                        .put("mobileId", entry.mobileId)
                        .put("changedAt", entry.changedAt)
                        .put("title", entry.title)
                        .put("content", entry.content)
                        .put("containsHealthData", entry.containsHealthData)
                        .apply {
                            entry.nextSteps?.let { value -> put("nextSteps", value) }
                        })
                }
            })
        preferences.edit()
            .putString(DRAFTS_KEY, secretBox.encrypt(state.toString()))
            .apply()
    }

    private fun requireText(value: String, message: String, maxLength: Int): String {
        val trimmed = value.trim()
        require(trimmed.isNotEmpty()) { message }
        require(trimmed.length <= maxLength) { "Die Eingabe ist zu lang." }
        return trimmed
    }

    private fun requireIsoDateTime(value: String): String {
        val trimmed = requireText(value, "Bitte eine Fälligkeit angeben.", 80)
        runCatching { Instant.parse(trimmed) }.getOrNull()?.let { instant -> return instant.toString() }
        runCatching { OffsetDateTime.parse(trimmed).toInstant() }.getOrNull()?.let { instant -> return instant.toString() }
        runCatching {
            LocalDate.parse(trimmed, GERMAN_DATE_FORMATTER)
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant()
        }.getOrNull()?.let { instant -> return instant.toString() }
        error("Bitte die Fälligkeit als Datum oder ISO-Zeitpunkt eingeben, z. B. 15.09.2026 oder 2026-09-15T10:00:00Z.")
    }

    private fun normalizeSeverity(value: String): String =
        when (value.trim().lowercase()) {
            "critical", "kritisch" -> "critical"
            "important", "wichtig", "hoch" -> "important"
            else -> "normal"
        }

    private fun normalizeNoteType(value: String): String =
        when (value.trim().lowercase()) {
            "telefonat", "telefon" -> "telefonat"
            "protokoll" -> "protokoll"
            "videocall", "video" -> "videocall"
            "email", "e-mail" -> "email"
            "bem" -> "bem"
            "anhoerung", "anhörung" -> "anhoerung"
            "interne_notiz", "intern", "maßnahmenidee", "massnahmenidee", "follow-up", "followup" -> "interne_notiz"
            "sonstiges" -> "sonstiges"
            else -> "gespraech"
        }

    private fun emptyDrafts(): MobileReturnDraftSet = MobileReturnDraftSet(emptyList(), emptyList(), emptyList(), emptyList())

    private companion object {
        private const val PREFERENCES_NAME = "gremia_sbv_companion_return_drafts"
        private const val DRAFTS_KEY = "return_note_drafts_v1"
        private const val MAX_DRAFTS = 1000
        private val GERMAN_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.uuuu")
    }
}
