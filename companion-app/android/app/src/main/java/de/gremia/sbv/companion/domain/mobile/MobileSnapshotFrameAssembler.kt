package de.gremia.sbv.companion.domain.mobile

class MobileSnapshotFrameAssembler(
    private val parser: MobileFrameParser = MobileQrFrameParser(),
) {
    private var session: FrameSession? = null

    fun accept(rawValue: String): MobileFrameAssemblyResult {
        val frame = parser.parse(rawValue)
        val current = session ?: FrameSession.create(frame).also { session = it }
        require(current.matches(frame)) {
            "Der QR-Frame gehört zu einer anderen Mobile-Projektion."
        }
        current.put(frame)
        val progress = current.progress()
        if (!progress.isComplete) return MobileFrameAssemblyResult.Accepted(progress)
        val envelope = current.payload()
        require(sha256(envelope).equals(current.packageSha256, ignoreCase = true)) {
            "Die zusammengesetzte Mobile-Projektion ist beschädigt."
        }
        return MobileFrameAssemblyResult.Complete(envelope, progress)
    }

    fun reset() {
        session = null
    }
}

private class FrameSession(
    val transferSessionId: String,
    val packageId: String,
    val frameCount: Int,
    val packageSha256: String,
    private val chunks: MutableList<String?>,
) {
    fun matches(frame: MobileQrFrame): Boolean =
        transferSessionId == frame.transferSessionId &&
            packageId == frame.packageId &&
            frameCount == frame.frameCount &&
            packageSha256 == frame.packageSha256

    fun put(frame: MobileQrFrame) {
        val existing = chunks[frame.frameIndex]
        require(existing == null || existing == frame.payload) {
            "Der QR-Frame widerspricht einem bereits erfassten Frame."
        }
        chunks[frame.frameIndex] = frame.payload
    }

    fun progress(): MobileFrameProgress =
        MobileFrameProgress(packageId, chunks.count { it != null }, frameCount)

    fun payload(): String = chunks.joinToString(separator = "") { chunk ->
        requireNotNull(chunk) { "Die Mobile-Projektion ist noch unvollständig." }
    }

    companion object {
        fun create(frame: MobileQrFrame): FrameSession =
            FrameSession(
                transferSessionId = frame.transferSessionId,
                packageId = frame.packageId,
                frameCount = frame.frameCount,
                packageSha256 = frame.packageSha256,
                chunks = MutableList(frame.frameCount) { null },
            )
    }
}
