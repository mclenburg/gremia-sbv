package de.gremia.sbv.companion.domain.mobile

import android.content.Context
import de.gremia.sbv.companion.data.transfer.TargetBoundReturnEncryptor
import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.util.UUID

class MobileReturnPackageCreator(
    private val context: Context,
    private val encryptor: TargetBoundReturnEncryptor = TargetBoundReturnEncryptor(),
) {
    fun create(snapshot: MobileSnapshot, sourceIdentity: TransferIdentity, notes: List<MobileReturnNoteDraft>): MobileReturnPackageFile {
        require(notes.isNotEmpty()) { "Es liegen keine mobilen Änderungen für eine Rückgabe vor." }
        val packageId = "mobile_return_${UUID.randomUUID()}"
        val createdAt = Instant.now().toString()
        val payload = JSONObject()
            .put("protocolVersion", "1.0")
            .put("schemaVersion", 1)
            .put("packageId", packageId)
            .put("sourceInstanceId", sourceIdentity.instanceId)
            .put("targetInstanceId", snapshot.returnTarget.instanceId)
            .put("sourceSnapshotPackageId", snapshot.packageId)
            .put("createdAt", createdAt)
            .put("changes", JSONArray().also { changes ->
                notes.forEach { note ->
                    changes.put(JSONObject()
                        .put("type", "create_note")
                        .put("mobileId", note.mobileId)
                        .put("caseId", note.caseId)
                        .put("changedAt", note.changedAt)
                        .put("title", note.title)
                        .put("content", note.content)
                        .put("containsHealthData", true))
                }
            })
            .toString()
        val envelope = encryptor.encrypt(payload, packageId, createdAt, snapshot.returnTarget)
        val directory = File(context.cacheDir, "mobile-return").apply { mkdirs() }
        val fileName = "$packageId.gsbvmobile"
        val file = File(directory, fileName)
        file.writeText(envelope, Charsets.UTF_8)
        return MobileReturnPackageFile(packageId, fileName, file.absolutePath, notes.size)
    }
}
