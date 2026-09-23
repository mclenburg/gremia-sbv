package de.gremia.sbv.companion.data.transfer

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import de.gremia.sbv.companion.domain.transfer.TransferRecipientPublicIdentity
import org.json.JSONObject
import java.security.MessageDigest
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

internal object MobileSnapshotOriginVerifier {
    fun verify(envelope: JSONObject, identity: TransferIdentity, trusted: TransferRecipientPublicIdentity?) {
        requireNotNull(trusted) { "Bitte den Desktop vor dem Import bestätigt koppeln." }
        val proof = envelope.optJSONObject("senderProof")
        require(proof != null && proof.optString("scheme") == "x25519-hkdf-hmac-sha256-v1" &&
            proof.optString("keyFingerprint") == trusted.keyFingerprint) {
            "Der Herkunftsnachweis fehlt oder passt nicht zur Kopplung. Bitte am gekoppelten Desktop neu übertragen."
        }
        val secret = TransferKeyDerivation.sharedSecret(identity.privateKeyPem, trusted.publicKeyPem)
        val key = TransferKeyDerivation.deriveKey(secret, byteArrayOf(),
            "gremia-sbv-mobile-snapshot-origin-v1:${envelope.getString("packageId")}:${identity.instanceId}")
        try {
            val integrity = envelope.getJSONObject("integrity")
            val message = listOf(integrity.getString("aadSha256"), integrity.getString("ciphertextSha256"),
                envelope.getJSONObject("crypto").getString("tag")).joinToString("|")
            val expected = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(key, "HmacSHA256")) }
                .doFinal(message.toByteArray(Charsets.UTF_8))
            val supplied = Base64.getDecoder().decode(proof.getString("mac"))
            require(MessageDigest.isEqual(expected, supplied)) { "Der Herkunftsnachweis ist ungültig. Import abgebrochen." }
        } finally { key.fill(0); secret.fill(0) }
    }
}
