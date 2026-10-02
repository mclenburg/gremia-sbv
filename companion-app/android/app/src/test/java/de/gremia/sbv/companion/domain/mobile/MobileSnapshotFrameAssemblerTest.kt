package de.gremia.sbv.companion.domain.mobile

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertIs

class MobileSnapshotFrameAssemblerTest {
    @Test
    fun completesSnapshotOnlyAfterAllValidFramesArrived() {
        val envelope = """{"format":"gremia-sbv-mobile-snapshot","payload":"encrypted"}"""
        val frames = framesFor(envelope, frameCount = 2)
        val assembler = MobileSnapshotFrameAssembler(FakeParser(frames))

        val first = assembler.accept("frame-1")
        assertIs<MobileFrameAssemblyResult.Accepted>(first)
        assertEquals(1, first.progress.receivedFrames)

        val complete = assembler.accept("frame-0")
        assertIs<MobileFrameAssemblyResult.Complete>(complete)
        assertEquals(envelope, complete.serializedEnvelope)
        assertEquals(2, complete.progress.receivedFrames)
    }

    @Test
    fun rejectsDamagedFramesBeforeTheyEnterTheAssembly() {
        val frame = frameFor("payload", index = 0, frameCount = 1, packageHash = sha256("anderes-paket"))

        assertFailsWith<IllegalArgumentException> {
            MobileSnapshotFrameAssembler(FakeParser(listOf(frame))).accept("frame-0")
        }
    }

    private fun framesFor(envelope: String, frameCount: Int): List<MobileQrFrame> {
        val chunkSize = (envelope.length + frameCount - 1) / frameCount
        val chunks = envelope.chunked(chunkSize)
        val packageHash = sha256(envelope)
        return chunks.mapIndexed { index, payload -> frameFor(payload, index, chunks.size, packageHash) }
    }

    private fun frameFor(
        payload: String,
        index: Int,
        frameCount: Int,
        packageHash: String,
    ): MobileQrFrame =
        MobileQrFrame(
            protocolVersion = "1.0",
            transferSessionId = "session-1",
            encryptionMode = "recipient_key_only",
            packageId = "mobile-snapshot-1",
            frameIndex = index,
            frameCount = frameCount,
            payloadLength = payload.toByteArray(Charsets.UTF_8).size,
            chunkChecksum = sha256(payload),
            packageSha256 = packageHash,
            payload = payload,
        )
}

private class FakeParser(frames: List<MobileQrFrame>) : MobileFrameParser {
    private val byInput = frames.mapIndexed { index, frame -> "frame-$index" to frame }.toMap()

    override fun parse(rawValue: String): MobileQrFrame =
        requireNotNull(byInput[rawValue]) { "Unbekannter Testframe." }
}
