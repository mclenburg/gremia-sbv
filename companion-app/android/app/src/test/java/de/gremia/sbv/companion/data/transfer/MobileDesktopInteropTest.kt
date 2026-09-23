package de.gremia.sbv.companion.data.transfer

import de.gremia.sbv.companion.domain.mobile.MobileFrameAssemblyResult
import de.gremia.sbv.companion.domain.mobile.MobilePairingExchange
import de.gremia.sbv.companion.domain.mobile.MobileReturnDraftSet
import de.gremia.sbv.companion.domain.mobile.MobileReturnNoteDraft
import de.gremia.sbv.companion.domain.mobile.MobileReturnPayloadBuilder
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotFrameAssembler
import de.gremia.sbv.companion.domain.transfer.X25519IdentityFactory
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertFailsWith
import kotlin.test.assertIs
import kotlin.test.assertTrue

class MobileDesktopInteropTest {
    @Test
    fun `real desktop and Kotlin exchange pairing QR snapshot and encrypted return`() {
        DesktopPeer().use { desktop ->
            val identity = X25519IdentityFactory().create()
            val request = desktop.call(JSONObject().put("action", "pairing"))
            val pairing = MobilePairingExchange().createResponse(request.getString("pairingRequest"), identity)
            val exported = desktop.call(JSONObject().put("action", "snapshot")
                .put("pairingResponse", pairing.pairingResponse).put("securityCode", pairing.securityCode))
            val frames = exported.getJSONArray("qrFrames")
            val assembler = MobileSnapshotFrameAssembler()
            // Scanning may start in the middle of a repeating sequence, not at frame zero.
            val results = (frames.length() - 1 downTo 0).map { assembler.accept(frames.getString(it)) }
            val assembled = assertIs<MobileFrameAssemblyResult.Complete>(results.last())
            val decryptor = TargetBoundSnapshotDecryptor({ pairing.desktopIdentity })
            assertFailsWith<IllegalArgumentException> {
                TargetBoundSnapshotDecryptor({ null }).decryptSnapshotEnvelope(assembled.serializedEnvelope, identity)
            }
            val snapshot = decryptor.decryptSnapshotEnvelope(assembled.serializedEnvelope, identity)
            val forgedOrigin = JSONObject(assembled.serializedEnvelope)
            forgedOrigin.getJSONObject("senderProof").put("mac", java.util.Base64.getEncoder().encodeToString(ByteArray(32)))
            assertFailsWith<IllegalArgumentException> { decryptor.decryptSnapshotEnvelope(forgedOrigin.toString(), identity) }
            val missingOrigin = JSONObject(assembled.serializedEnvelope).apply { remove("senderProof") }
            assertFailsWith<IllegalArgumentException> { decryptor.decryptSnapshotEnvelope(missingOrigin.toString(), identity) }
            assertEquals("Änne Übung", snapshot.cases.single().displayName)
            assertEquals("light", snapshot.themeMode)
            assertEquals(exported.getString("packageId"), snapshot.packageId)
            assertFailsWith<IllegalArgumentException> {
                decryptor.decryptSnapshotEnvelope(assembled.serializedEnvelope, X25519IdentityFactory().create())
            }
            val damaged = JSONObject(assembled.serializedEnvelope)
            val ciphertext = damaged.getString("payload")
            damaged.put("payload", (if (ciphertext[0] == 'A') "B" else "A") + ciphertext.drop(1))
            assertFailsWith<IllegalArgumentException> {
                decryptor.decryptSnapshotEnvelope(damaged.toString(), identity)
            }

            val now = Instant.now().toString()
            val drafts = MobileReturnDraftSet(listOf(MobileReturnNoteDraft(
                "interop-note", snapshot.cases.single().id, now, "Gespräch – Rückkehr",
                "Änderung: Größe, Straße und 職場 bleiben unverändert.", "interne_notiz", "Rückmeldung prüfen",
            )), emptyList(), emptyList())
            val payload = MobileReturnPayloadBuilder().build("interop-return", now, snapshot, identity, drafts)
            val envelope = TargetBoundReturnEncryptor().encrypt(payload, "interop-return", now, snapshot.returnTarget, identity)
            val missingReturnOrigin = JSONObject(envelope).apply { remove("senderProof") }
            val forgedReturnOrigin = JSONObject(envelope).apply {
                getJSONObject("senderProof").put("mac", java.util.Base64.getEncoder().encodeToString(ByteArray(32)))
            }
            val imposter = X25519IdentityFactory().create().copy(keyFingerprint = identity.keyFingerprint)
            val forgedReturn = TargetBoundReturnEncryptor().encrypt(payload, "interop-return", now, snapshot.returnTarget, imposter)
            for (invalid in listOf(missingReturnOrigin.toString(), forgedReturnOrigin.toString(), forgedReturn)) {
                assertTrue(desktop.call(JSONObject().put("action", "inspectRejected").put("envelope", invalid)).getBoolean("rejected"))
            }
            val inspection = desktop.call(JSONObject().put("action", "inspect").put("envelope", envelope))
            assertTrue(inspection.getBoolean("canImport"))
            assertEquals(1, inspection.getInt("noteCount"))
            assertEquals(0, desktop.call(JSONObject().put("action", "state")).getJSONArray("notes").length())
            val imported = desktop.call(JSONObject().put("action", "import").put("envelope", envelope))
            assertEquals(1, imported.getInt("createdNoteCount"))
            val state = desktop.call(JSONObject().put("action", "state"))
            val note = state.getJSONArray("notes").getJSONObject(0)
            assertEquals(drafts.notes.single().content, note.getString("content"))
            assertEquals(drafts.notes.single().nextSteps, note.getString("next_steps"))
            assertFalse(state.getJSONArray("audit").toString().contains(drafts.notes.single().content))
            val duplicate = desktop.call(JSONObject().put("action", "inspect").put("envelope", envelope))
            assertFalse(duplicate.getBoolean("canImport"))
        }
    }
}

private class DesktopPeer : AutoCloseable {
    private val root = File(requireNotNull(System.getProperty("gremia.repository")))
    private val process = ProcessBuilder("node", "--import", "tsx", "tests/helpers/mobileDesktopInterop.ts")
        .directory(root).redirectError(ProcessBuilder.Redirect.INHERIT).start()
    private val input = process.outputStream.bufferedWriter()
    private val output = process.inputStream.bufferedReader()
    private val reader = Executors.newSingleThreadExecutor()

    fun call(request: JSONObject): JSONObject {
        input.write(request.toString())
        input.newLine()
        input.flush()
        val response = reader.submit<String?> { output.readLine() }.get(30, TimeUnit.SECONDS)
        return JSONObject(requireNotNull(response) { "Desktop peer stopped before responding; see stderr." })
    }

    override fun close() {
        try {
            runCatching { input.close() }
            if (!process.waitFor(5, TimeUnit.SECONDS)) {
                process.destroyForcibly()
                process.waitFor(5, TimeUnit.SECONDS)
            }
        } finally {
            reader.shutdownNow()
            output.close()
        }
    }
}
