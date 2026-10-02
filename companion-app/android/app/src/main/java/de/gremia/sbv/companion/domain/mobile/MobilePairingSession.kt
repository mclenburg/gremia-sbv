package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import de.gremia.sbv.companion.domain.transfer.TransferRecipientPublicIdentity
import java.time.Duration
import java.time.Instant

data class TrustedMobileDesktop(val identity: TransferRecipientPublicIdentity, val confirmedAt: String)

interface MobileDesktopTrustStore {
    fun current(): TrustedMobileDesktop?
    fun save(value: TrustedMobileDesktop)
    fun clear()
}

class MobilePairingSession(
    private val mobile: TransferIdentity,
    private val store: MobileDesktopTrustStore,
    private val exchange: MobilePairingExchange = MobilePairingExchange(),
    private val now: () -> Instant = Instant::now,
    private val timeout: Duration = Duration.ofMinutes(5),
) {
    private var candidate: MobilePairingResponseResult? = null
    private var lastActivity: Instant? = null
    private var startedAt: Instant? = null

    fun begin(request: String): MobilePairingResponseResult {
        cancel()
        require(request.length <= 16_384) { "Die Kopplungsanfrage ist zu groß." }
        val response = exchange.createResponse(request.trim(), mobile)
        val age = Duration.between(Instant.parse(response.requestedAt), now())
        require(!age.isNegative && age <= timeout) { "Die Kopplungsanfrage ist abgelaufen. Bitte am Desktop neu beginnen." }
        candidate = response
        lastActivity = now()
        startedAt = now()
        return response
    }

    fun pending(): MobilePairingResponseResult? {
        expire()
        return candidate
    }

    fun touch() { if (!expire() && candidate != null) lastActivity = now() }

    fun expire(): Boolean {
        val last = lastActivity ?: return false
        if (Duration.between(last, now()) < timeout && Duration.between(requireNotNull(startedAt), now()) < timeout.multipliedBy(2)) return false
        cancel()
        return true
    }

    fun confirm(code: String): TrustedMobileDesktop {
        val pending = pending() ?: error("Keine gültige Kopplung vorhanden. Bitte neu beginnen.")
        require(code.trim().uppercase() == pending.securityCode) { "Die Sicherheitscodes stimmen nicht überein." }
        return TrustedMobileDesktop(pending.desktopIdentity, now().toString()).also {
            store.save(it)
            cancel()
        }
    }

    fun cancel() { candidate = null; lastActivity = null; startedAt = null }
}

fun MobileDesktopTrustStore.accepts(snapshot: MobileSnapshot): Boolean {
    val trusted = current()?.identity ?: return false
    return snapshot.sourceInstanceId == trusted.instanceId &&
        snapshot.returnTarget.instanceId == trusted.instanceId &&
        snapshot.returnTarget.keyFingerprint == trusted.keyFingerprint &&
        snapshot.returnTarget.publicKeyPem == trusted.publicKeyPem
}
