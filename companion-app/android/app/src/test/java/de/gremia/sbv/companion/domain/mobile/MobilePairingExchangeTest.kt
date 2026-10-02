package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import de.gremia.sbv.companion.domain.transfer.X25519IdentityFactory
import java.nio.charset.StandardCharsets
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MobilePairingExchangeTest {
    @Test
    fun createsPairingResponseWithVerificationCodeForDesktopRequest() {
        val desktop = identity()
        val mobile = identity()
        val request = pairingRequest(desktop)

        val result = MobilePairingExchange().createResponse(request, mobile)

        assertTrue(result.pairingResponse.startsWith("GSBVMOBILEPAIR1."))
        assertTrue(Regex("^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$").matches(result.securityCode))
        assertTrue(result.pairingResponse.contains("."))
        assertFalse(result.pairingResponse.contains(mobile.privateKeyPem))
        assertTrue(result.desktopInstanceId == desktop.instanceId)
    }

    @Test
    fun rejectsUnsupportedPairingRequests() {
        assertFailsWith<IllegalArgumentException> {
            MobilePairingExchange().createResponse("GSBVMOBILEPAIR1.invalid", identity())
        }
    }

    private fun identity(): TransferIdentity = X25519IdentityFactory().create()

    private fun pairingRequest(desktop: TransferIdentity): String {
        val json = """{"protocolVersion":"1.0","role":"desktop_pairing_request","sessionId":"session-mobile-pairing-test","createdAt":"2026-09-17T12:00:00.000Z","desktopRecipientToken":"${desktop.recipientToken}"}"""
        return "GSBVMOBILEPAIR1.${Base64.getUrlEncoder().withoutPadding().encodeToString(json.toString().toByteArray(StandardCharsets.UTF_8))}"
    }
}
