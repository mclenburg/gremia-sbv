package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import java.time.Duration
import java.time.Instant

class MobileSnapshotQrController(
    private val identity: TransferIdentity,
    private val snapshotStore: MobileSnapshotStore,
    private val isTrusted: (MobileSnapshot) -> Boolean,
    private val assembler: MobileSnapshotFrameAssembler = MobileSnapshotFrameAssembler(),
    private val decryptor: MobileSnapshotEnvelopeDecryptor,
    private val now: () -> Instant = { Instant.now() },
    private val inactivityTimeout: Duration = DEFAULT_INACTIVITY_TIMEOUT,
) {
    private var pendingSnapshot: PendingSnapshot? = null
    private var lastActivityAt: Instant? = null

    fun pendingPreview(): MobileSnapshotImportPreview? =
        pendingSnapshot?.preview

    fun accept(rawFrame: String): MobileSnapshotIntakeResult {
        return try {
            expireInactiveSessionIfNeeded()
            if (pendingSnapshot != null) {
                return MobileSnapshotIntakeResult.Error(
                    "Mobile-Projektion ist vollständig. Bitte Import bestätigen oder abbrechen.",
                )
            }
            lastActivityAt = now()
            when (val result = assembler.accept(rawFrame)) {
                is MobileFrameAssemblyResult.Accepted -> MobileSnapshotIntakeResult.Progress(
                    "Frame erfasst: ${result.progress.receivedFrames} von ${result.progress.frameCount}.",
                    result.progress,
                )
                is MobileFrameAssemblyResult.Complete -> {
                    val snapshot = decryptor.decryptSnapshotEnvelope(result.serializedEnvelope, identity)
                    assembler.reset()
                    check(isTrusted(snapshot)) { "Der Desktop ist nicht bestätigt gekoppelt. Bitte zuerst koppeln." }
                    val preview = snapshot.toImportPreview(result.progress)
                    pendingSnapshot = PendingSnapshot(snapshot, preview)
                    MobileSnapshotIntakeResult.ReadyForConfirmation(
                        "Mobile Projektion geprüft: ${snapshot.cases.size} Fallakte(n), ${snapshot.deadlines.size} offene Frist(en). Bitte Import bestätigen.",
                        preview,
                    )
                }
            }
        } catch (cause: IllegalArgumentException) {
            MobileSnapshotIntakeResult.Error(cause.message ?: "QR-Frame konnte nicht verarbeitet werden.")
        } catch (cause: IllegalStateException) {
            MobileSnapshotIntakeResult.Error(cause.message ?: "Mobile-Projektion konnte nicht übernommen werden.")
        } catch (_: Exception) {
            MobileSnapshotIntakeResult.Error("Mobile-Projektion konnte nicht entschlüsselt oder geprüft werden.")
        }
    }

    fun confirmPendingImport(): MobileSnapshotIntakeResult {
        return try {
            expireInactiveSessionIfNeeded()
            val pending = pendingSnapshot
                ?: return MobileSnapshotIntakeResult.Error("Es liegt keine geprüfte Mobile-Projektion zur Übernahme vor.")
            check(isTrusted(pending.snapshot)) { "Die Desktop-Kopplung ist nicht mehr gültig. Bitte erneut koppeln." }
            snapshotStore.save(pending.snapshot)
            pendingSnapshot = null
            lastActivityAt = null
            MobileSnapshotIntakeResult.Completed(
                "Mobile Projektion übernommen: ${pending.preview.caseCount} Fallakte(n), ${pending.preview.deadlineCount} offene Frist(en).",
                pending.preview,
            )
        } catch (cause: IllegalStateException) {
            MobileSnapshotIntakeResult.Error(cause.message ?: "Mobile-Projektion konnte nicht übernommen werden.")
        }
    }

    fun cancelPendingImport(): MobileSnapshotIntakeResult.Canceled {
        assembler.reset()
        pendingSnapshot = null
        lastActivityAt = null
        return MobileSnapshotIntakeResult.Canceled("Mobile-Projektion verworfen. Der bisherige Arbeitsstand bleibt erhalten.")
    }

    fun reset() {
        assembler.reset()
        pendingSnapshot = null
        lastActivityAt = null
    }

    private fun expireInactiveSessionIfNeeded() {
        val lastActivity = lastActivityAt ?: return
        if (Duration.between(lastActivity, now()) <= inactivityTimeout) return
        assembler.reset()
        pendingSnapshot = null
        lastActivityAt = null
        throw IllegalStateException("Die QR-Import-Sitzung ist abgelaufen. Bitte neu scannen.")
    }

    private data class PendingSnapshot(
        val snapshot: MobileSnapshot,
        val preview: MobileSnapshotImportPreview,
    )

    companion object {
        val DEFAULT_INACTIVITY_TIMEOUT: Duration = Duration.ofMinutes(5)
    }
}

sealed class MobileSnapshotIntakeResult {
    abstract val message: String

    data class Progress(
        override val message: String,
        val progress: MobileFrameProgress,
    ) : MobileSnapshotIntakeResult()

    data class ReadyForConfirmation(
        override val message: String,
        val preview: MobileSnapshotImportPreview,
    ) : MobileSnapshotIntakeResult()

    data class Completed(
        override val message: String,
        val preview: MobileSnapshotImportPreview,
    ) : MobileSnapshotIntakeResult()

    data class Error(
        override val message: String,
    ) : MobileSnapshotIntakeResult()

    data class Canceled(
        override val message: String,
    ) : MobileSnapshotIntakeResult()
}
