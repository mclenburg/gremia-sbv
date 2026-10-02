package de.gremia.sbv.companion.domain.mobile

import android.content.Context
import de.gremia.sbv.companion.data.transfer.TargetBoundReturnEncryptor
import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import java.io.File
import java.time.Instant
import java.util.UUID

class MobileReturnPackageCreator(
    private val context: Context,
    private val encryptor: TargetBoundReturnEncryptor = TargetBoundReturnEncryptor(),
    private val payloadBuilder: MobileReturnPayloadBuilder = MobileReturnPayloadBuilder(),
) {
    fun create(snapshot: MobileSnapshot, sourceIdentity: TransferIdentity, drafts: MobileReturnDraftSet): MobileReturnPackageFile {
        val packageId = "mobile_return_${UUID.randomUUID()}"
        val createdAt = Instant.now().toString()
        val payload = payloadBuilder.build(packageId, createdAt, snapshot, sourceIdentity, drafts)
        val envelope = encryptor.encrypt(payload, packageId, createdAt, snapshot.returnTarget, sourceIdentity)
        val directory = File(context.cacheDir, "mobile-return").apply { mkdirs() }
        val fileName = "$packageId.gsbvmobile"
        val file = File(directory, fileName)
        file.writeText(envelope, Charsets.UTF_8)
        return MobileReturnPackageFile(packageId, fileName, file.absolutePath, drafts.changeCount)
    }

    fun discardTemporaryPackage(filePath: String) {
        val directory = File(context.cacheDir, "mobile-return").canonicalFile
        val file = File(filePath).canonicalFile
        if (file.parentFile == directory && file.exists()) file.delete()
    }

    fun clearTemporaryPackages() {
        val directory = File(context.cacheDir, "mobile-return")
        directory.listFiles()?.forEach { file -> if (file.isFile) file.delete() }
    }
}
