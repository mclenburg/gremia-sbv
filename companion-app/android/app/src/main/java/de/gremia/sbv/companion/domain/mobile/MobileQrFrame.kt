package de.gremia.sbv.companion.domain.mobile

data class MobileQrFrame(
    val protocolVersion: String,
    val transferSessionId: String,
    val encryptionMode: String,
    val packageId: String,
    val frameIndex: Int,
    val frameCount: Int,
    val payloadLength: Int,
    val chunkChecksum: String,
    val packageSha256: String,
    val payload: String,
)

data class MobileFrameProgress(
    val packageId: String,
    val receivedFrames: Int,
    val frameCount: Int,
) {
    val isComplete: Boolean = receivedFrames == frameCount
}

sealed class MobileFrameAssemblyResult {
    data class Accepted(val progress: MobileFrameProgress) : MobileFrameAssemblyResult()
    data class Complete(
        val serializedEnvelope: String,
        val progress: MobileFrameProgress,
    ) : MobileFrameAssemblyResult()
}
