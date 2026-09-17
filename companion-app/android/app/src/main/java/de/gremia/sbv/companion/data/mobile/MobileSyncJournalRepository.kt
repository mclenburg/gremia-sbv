package de.gremia.sbv.companion.data.mobile

import android.content.Context
import de.gremia.sbv.companion.data.security.AndroidSecretBox
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSyncDirection
import de.gremia.sbv.companion.domain.mobile.MobileSyncEvent
import de.gremia.sbv.companion.domain.mobile.MobileSyncHistoryPolicy
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

class MobileSyncJournalRepository(
    context: Context,
    private val secretBox: AndroidSecretBox = AndroidSecretBox("gremia_sbv_companion_sync_journal_v1"),
    private val policy: MobileSyncHistoryPolicy = MobileSyncHistoryPolicy(),
) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun listEvents(): List<MobileSyncEvent> {
        val stored = preferences.getString(EVENTS_KEY, null) ?: return emptyList()
        val items = JSONArray(secretBox.decrypt(stored))
        return List(items.length()) { index -> decode(items.getJSONObject(index)) }
    }

    fun recordSnapshotImport(snapshot: MobileSnapshot, occurredAt: Instant = Instant.now()) {
        append(MobileSyncEvent(
            eventId = "snapshot:${snapshot.packageId}",
            direction = MobileSyncDirection.DesktopToMobile,
            packageId = snapshot.packageId,
            occurredAt = occurredAt.toString(),
            caseCount = snapshot.cases.size,
            deadlineCount = snapshot.deadlines.size,
            changeCount = 0,
        ))
    }

    fun recordReturnExport(packageId: String, changeCount: Int, occurredAt: Instant = Instant.now()) {
        append(MobileSyncEvent(
            eventId = "return:$packageId",
            direction = MobileSyncDirection.MobileToDesktop,
            packageId = packageId,
            occurredAt = occurredAt.toString(),
            caseCount = 0,
            deadlineCount = 0,
            changeCount = changeCount,
        ))
    }

    fun clear() {
        preferences.edit().remove(EVENTS_KEY).apply()
    }

    private fun append(event: MobileSyncEvent) {
        val events = policy.append(listEvents(), event)
        val encoded = JSONArray().also { items ->
            events.forEach { item -> items.put(encode(item)) }
        }.toString()
        preferences.edit().putString(EVENTS_KEY, secretBox.encrypt(encoded)).apply()
    }

    private fun encode(event: MobileSyncEvent): JSONObject =
        JSONObject()
            .put("eventId", event.eventId)
            .put("direction", event.direction.name)
            .put("packageId", event.packageId)
            .put("occurredAt", event.occurredAt)
            .put("caseCount", event.caseCount)
            .put("deadlineCount", event.deadlineCount)
            .put("changeCount", event.changeCount)

    private fun decode(value: JSONObject): MobileSyncEvent =
        MobileSyncEvent(
            eventId = value.getString("eventId"),
            direction = MobileSyncDirection.valueOf(value.getString("direction")),
            packageId = value.getString("packageId"),
            occurredAt = value.getString("occurredAt"),
            caseCount = value.optInt("caseCount"),
            deadlineCount = value.optInt("deadlineCount"),
            changeCount = value.optInt("changeCount"),
        )

    private companion object {
        private const val PREFERENCES_NAME = "gremia_sbv_companion_sync_journal"
        private const val EVENTS_KEY = "sync_events_v1"
    }
}
