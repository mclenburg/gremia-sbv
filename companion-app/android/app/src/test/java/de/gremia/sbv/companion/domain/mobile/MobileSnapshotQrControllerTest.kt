package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import java.time.Duration
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

class MobileSnapshotQrControllerTest {
    @Test
    fun rejectsUntrustedDesktopAndRevocationBeforeImportWithoutReplacingData() {
        val store = FakeSnapshotStore(snapshot("existing", 1, 1))
        var trusted = false
        val controller = controller(framesFor("{}", 1), store, snapshot("incoming", 1, 1),
            isTrusted = { trusted })
        assertIs<MobileSnapshotIntakeResult.Error>(controller.accept("frame-0"))
        assertNull(controller.pendingPreview())
        trusted = true
        assertIs<MobileSnapshotIntakeResult.ReadyForConfirmation>(controller.accept("frame-0"))
        trusted = false
        assertIs<MobileSnapshotIntakeResult.Error>(controller.confirmPendingImport())
        assertEquals("existing", store.current()?.packageId)
    }

    @Test
    fun waitsForExplicitConfirmationBeforeReplacingTheStoredSnapshot() {
        val frames = framesFor("""{"envelope":"one"}""", frameCount = 2)
        val store = FakeSnapshotStore(snapshot("existing", caseCount = 1, deadlineCount = 1))
        val controller = controller(frames, store, snapshot("incoming", caseCount = 3, deadlineCount = 5))

        assertIs<MobileSnapshotIntakeResult.Progress>(controller.accept("frame-0"))
        val ready = assertIs<MobileSnapshotIntakeResult.ReadyForConfirmation>(controller.accept("frame-1"))

        assertEquals("existing", store.current()?.packageId)
        assertEquals(3, ready.preview.caseCount)
        assertEquals(5, ready.preview.deadlineCount)
        assertEquals(ready.preview, controller.pendingPreview())

        val completed = assertIs<MobileSnapshotIntakeResult.Completed>(controller.confirmPendingImport())

        assertEquals("incoming", store.current()?.packageId)
        assertEquals(3, completed.preview.caseCount)
        assertNull(controller.pendingPreview())
    }

    @Test
    fun cancelKeepsThePreviousSnapshotAndClearsPendingImport() {
        val frames = framesFor("""{"envelope":"one"}""", frameCount = 1)
        val store = FakeSnapshotStore(snapshot("existing", caseCount = 1, deadlineCount = 1))
        val controller = controller(frames, store, snapshot("incoming", caseCount = 3, deadlineCount = 5))

        assertIs<MobileSnapshotIntakeResult.ReadyForConfirmation>(controller.accept("frame-0"))
        assertIs<MobileSnapshotIntakeResult.Canceled>(controller.cancelPendingImport())

        assertEquals("existing", store.current()?.packageId)
        assertNull(controller.pendingPreview())
    }

    @Test
    fun importSessionExpiresWithoutReplacingThePreviousSnapshot() {
        val frames = framesFor("""{"envelope":"one"}""", frameCount = 1)
        val store = FakeSnapshotStore(snapshot("existing", caseCount = 1, deadlineCount = 1))
        var currentTime = Instant.parse("2026-09-16T10:00:00Z")
        val controller = controller(
            frames = frames,
            store = store,
            decryptedSnapshot = snapshot("incoming", caseCount = 3, deadlineCount = 5),
            now = { currentTime },
            inactivityTimeout = Duration.ofMinutes(5),
        )

        assertIs<MobileSnapshotIntakeResult.ReadyForConfirmation>(controller.accept("frame-0"))
        currentTime = Instant.parse("2026-09-16T10:06:00Z")
        val expired = assertIs<MobileSnapshotIntakeResult.Error>(controller.confirmPendingImport())

        assertEquals("Die QR-Import-Sitzung ist abgelaufen. Bitte neu scannen.", expired.message)
        assertEquals("existing", store.current()?.packageId)
        assertNull(controller.pendingPreview())
    }

    private fun controller(
        frames: List<MobileQrFrame>,
        store: FakeSnapshotStore,
        decryptedSnapshot: MobileSnapshot,
        now: () -> Instant = { Instant.parse("2026-09-16T10:00:00Z") },
        inactivityTimeout: Duration = Duration.ofMinutes(5),
        isTrusted: (MobileSnapshot) -> Boolean = { true },
    ): MobileSnapshotQrController =
        MobileSnapshotQrController(
            identity = identity(),
            snapshotStore = store,
            isTrusted = isTrusted,
            assembler = MobileSnapshotFrameAssembler(QrControllerFakeParser(frames)),
            decryptor = FakeDecryptor(decryptedSnapshot),
            now = now,
            inactivityTimeout = inactivityTimeout,
        )

    private fun framesFor(envelope: String, frameCount: Int): List<MobileQrFrame> {
        val chunkSize = (envelope.length + frameCount - 1) / frameCount
        val chunks = envelope.chunked(chunkSize)
        val packageHash = sha256(envelope)
        return chunks.mapIndexed { index, payload ->
            MobileQrFrame(
                protocolVersion = "1.0",
                transferSessionId = "session-1",
                encryptionMode = "recipient_key_only",
                packageId = "mobile-snapshot-1",
                frameIndex = index,
                frameCount = chunks.size,
                payloadLength = payload.toByteArray(Charsets.UTF_8).size,
                chunkChecksum = sha256(payload),
                packageSha256 = packageHash,
                payload = payload,
            )
        }
    }

    private fun snapshot(packageId: String, caseCount: Int, deadlineCount: Int): MobileSnapshot =
        MobileSnapshot(
            packageId = packageId,
            sourceInstanceId = "GSBV1AAAAA",
            targetInstanceId = "GSBV1BBBBB",
            returnTarget = MobileReturnTarget("GSBV1AAAAA", "fingerprint", "PUBLIC KEY"),
            createdAt = "2026-09-16T10:00:00Z",
            themeMode = "dark",
            cases = List(caseCount) { index ->
                MobileCaseProjection(
                    id = "case-$index",
                    caseNumber = "SBV-$index",
                    displayName = "Person $index",
                    category = "beteiligung",
                    status = "offen",
                    priority = "normal",
                    updatedAt = "2026-09-16T09:00:00Z",
                )
            },
            deadlines = List(deadlineCount) { index ->
                MobileDeadlineProjection(
                    id = "deadline-$index",
                    caseId = "case-0",
                    type = "follow_up",
                    title = "Frist $index",
                    dueAt = "2026-09-20T10:00:00Z",
                    reminderAt = null,
                    legalBasis = "§ 178 SGB IX",
                    severity = "normal",
                    status = "open",
                    isLegalDeadline = false,
                    updatedAt = "2026-09-16T09:00:00Z",
                )
            },
            rawPayloadJson = "{}",
        )

    private fun identity(): TransferIdentity =
        TransferIdentity(
            instanceId = "GSBV1BBBBB",
            keyFingerprint = "fingerprint",
            publicKeyPem = "PUBLIC KEY",
            privateKeyPem = "PRIVATE KEY",
            recipientToken = "GSBV1BBBBB:PUBLIC",
            createdAt = "2026-09-16T09:00:00Z",
        )
}

private class QrControllerFakeParser(frames: List<MobileQrFrame>) : MobileFrameParser {
    private val byInput = frames.mapIndexed { index, frame -> "frame-$index" to frame }.toMap()

    override fun parse(rawValue: String): MobileQrFrame =
        requireNotNull(byInput[rawValue]) { "Unbekannter Testframe." }
}

private class FakeDecryptor(private val snapshot: MobileSnapshot) : MobileSnapshotEnvelopeDecryptor {
    override fun decryptSnapshotEnvelope(envelopeText: String, identity: TransferIdentity): MobileSnapshot =
        snapshot
}

private class FakeSnapshotStore(initial: MobileSnapshot?) : MobileSnapshotStore {
    private var stored = initial

    override fun current(): MobileSnapshot? = stored

    override fun save(snapshot: MobileSnapshot) {
        stored = snapshot
    }
}
