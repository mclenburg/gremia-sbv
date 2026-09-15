package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.data.mobile.MobileSnapshotRepository
import de.gremia.sbv.companion.data.transfer.TargetBoundSnapshotDecryptor
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class MobileSnapshotQrController(
    private val identity: TransferIdentity,
    private val snapshotRepository: MobileSnapshotRepository,
    private val assembler: MobileSnapshotFrameAssembler = MobileSnapshotFrameAssembler(),
    private val decryptor: TargetBoundSnapshotDecryptor = TargetBoundSnapshotDecryptor(),
) {
    fun accept(rawFrame: String): MobileSnapshotIntakeResult =
        try {
            when (val result = assembler.accept(rawFrame)) {
                is MobileFrameAssemblyResult.Accepted -> MobileSnapshotIntakeResult.Progress(
                    "Frame erfasst: ${result.progress.receivedFrames} von ${result.progress.frameCount}.",
                    result.progress,
                )
                is MobileFrameAssemblyResult.Complete -> {
                    val snapshot = decryptor.decryptSnapshotEnvelope(result.serializedEnvelope, identity)
                    snapshotRepository.save(snapshot)
                    assembler.reset()
                    MobileSnapshotIntakeResult.Completed(
                        "Mobile Projektion übernommen: ${snapshot.cases.size} Fallakte(n), ${snapshot.deadlines.size} offene Frist(en).",
                        result.progress,
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

    fun reset() {
        assembler.reset()
    }
}

sealed class MobileSnapshotIntakeResult {
    abstract val message: String

    data class Progress(
        override val message: String,
        val progress: MobileFrameProgress,
    ) : MobileSnapshotIntakeResult()

    data class Completed(
        override val message: String,
        val progress: MobileFrameProgress,
    ) : MobileSnapshotIntakeResult()

    data class Error(
        override val message: String,
    ) : MobileSnapshotIntakeResult()
}
