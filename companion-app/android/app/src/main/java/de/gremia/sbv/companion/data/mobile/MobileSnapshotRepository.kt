package de.gremia.sbv.companion.data.mobile

import android.content.Context
import de.gremia.sbv.companion.data.security.AndroidSecretBox
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotPayloadDecoder
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotStore

class MobileSnapshotRepository(
    context: Context,
    private val secretBox: AndroidSecretBox = AndroidSecretBox("gremia_sbv_companion_snapshot_v1"),
    private val decoder: MobileSnapshotPayloadDecoder = MobileSnapshotPayloadDecoder(),
) : MobileSnapshotStore {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    override fun current(): MobileSnapshot? {
        val stored = preferences.getString(SNAPSHOT_KEY, null) ?: return null
        return decoder.decodePlainPayload(secretBox.decrypt(stored))
    }

    override fun save(snapshot: MobileSnapshot) {
        preferences.edit()
            .putString(SNAPSHOT_KEY, secretBox.encrypt(snapshot.rawPayloadJson))
            .apply()
    }

    private companion object {
        private const val PREFERENCES_NAME = "gremia_sbv_companion_snapshot"
        private const val SNAPSHOT_KEY = "current_snapshot_v1"
    }
}
