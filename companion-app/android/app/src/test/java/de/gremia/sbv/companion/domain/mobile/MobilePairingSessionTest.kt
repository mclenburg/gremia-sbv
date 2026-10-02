package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.X25519IdentityFactory
import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class MobilePairingSessionTest {
    private val mobile = X25519IdentityFactory().create()
    private val desktop = X25519IdentityFactory().create()
    private val start = Instant.parse("2026-09-22T08:00:00Z")

    @Test
    fun `only explicit matching code confirmation persists trust`() {
        val store = MemoryTrust()
        val session = MobilePairingSession(mobile, store, now = { start })
        val pending = session.begin(request())
        assertNull(store.current())
        assertFailsWith<IllegalArgumentException> { session.confirm("WRONG-CODE") }
        assertNull(store.current())
        session.confirm(pending.securityCode)
        assertEquals(desktop.keyFingerprint, store.current()?.identity?.keyFingerprint)
        assertNull(session.pending())
    }

    @Test
    fun `cancel and expiration preserve an existing trusted desktop`() {
        val store = MemoryTrust()
        var now = start
        val session = MobilePairingSession(mobile, store, now = { now })
        session.confirm(session.begin(request()).securityCode)
        val previous = store.current()
        session.begin(request())
        session.cancel()
        assertEquals(previous, store.current())
        val pending = session.begin(request())
        now = start.plus(Duration.ofMinutes(6))
        assertEquals(true, session.expire())
        assertNull(session.pending())
        assertFailsWith<IllegalStateException> { session.confirm(pending.securityCode) }
        assertEquals(previous, store.current())
    }

    @Test
    fun `rejects stale requests and does not persist changed keys without confirmation`() {
        val store = MemoryTrust()
        val session = MobilePairingSession(mobile, store, now = { start })
        assertFailsWith<IllegalArgumentException> { session.begin(request(start.minusSeconds(3600))) }
        assertNull(store.current())
    }

    private fun request(createdAt: Instant = start): String {
        val json = JSONObject().put("protocolVersion", "1.0").put("role", "desktop_pairing_request")
            .put("sessionId", "pairing-test").put("createdAt", createdAt.toString())
            .put("desktopRecipientToken", desktop.recipientToken)
        return "GSBVMOBILEPAIR1." + Base64.getUrlEncoder().withoutPadding().encodeToString(json.toString().toByteArray())
    }

    private class MemoryTrust : MobileDesktopTrustStore {
        private var trusted: TrustedMobileDesktop? = null
        override fun current() = trusted
        override fun save(value: TrustedMobileDesktop) { trusted = value }
        override fun clear() { trusted = null }
    }
}
