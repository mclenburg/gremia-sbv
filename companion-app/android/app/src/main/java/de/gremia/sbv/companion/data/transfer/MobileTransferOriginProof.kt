package de.gremia.sbv.companion.data.transfer

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import de.gremia.sbv.companion.domain.transfer.TransferRecipientPublicIdentity
import org.json.JSONObject
import java.security.MessageDigest
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

internal enum class MobileTransferPurpose(val protocolName: String) { SNAPSHOT("snapshot"), RETURN("return") }

internal object MobileTransferOriginProof {
    fun authenticate(envelope: JSONObject, sender: TransferIdentity, recipientPublicKeyPem: String,
                     purpose: MobileTransferPurpose): JSONObject = envelope.put("senderProof", JSONObject()
        .put("scheme", "x25519-hkdf-hmac-sha256-v1")
        .put("keyFingerprint", sender.keyFingerprint)
        .put("mac", Base64.getEncoder().encodeToString(computeMac(envelope, sender, recipientPublicKeyPem, purpose))))

    fun verify(envelope: JSONObject, identity: TransferIdentity, trusted: TransferRecipientPublicIdentity?,
               purpose: MobileTransferPurpose) {
        requireNotNull(trusted) { "Bitte den Desktop vor dem Import bestätigt koppeln." }
        val proof = envelope.optJSONObject("senderProof")
        require(proof != null && proof.optString("scheme") == "x25519-hkdf-hmac-sha256-v1" &&
            proof.optString("keyFingerprint") == trusted.keyFingerprint) {
            "Der Herkunftsnachweis fehlt oder passt nicht zur Kopplung. Bitte am gekoppelten Desktop neu übertragen."
        }
        val expected = computeMac(envelope, identity, trusted.publicKeyPem, purpose)
        val supplied = Base64.getDecoder().decode(proof.getString("mac"))
        require(MessageDigest.isEqual(expected, supplied)) { "Der Herkunftsnachweis ist ungültig. Import abgebrochen." }
    }

    private fun computeMac(envelope: JSONObject, local: TransferIdentity, remotePublicKeyPem: String,
                           purpose: MobileTransferPurpose): ByteArray {
        val secret = TransferKeyDerivation.sharedSecret(local.privateKeyPem, remotePublicKeyPem)
        var key: ByteArray? = null
        try {
            val target = envelope.getJSONObject("recipientBinding").getString("targetInstanceId")
            key = TransferKeyDerivation.deriveKey(secret, byteArrayOf(),
                "gremia-sbv-mobile-${purpose.protocolName}-origin-v1:${envelope.getString("packageId")}:$target")
            val integrity = envelope.getJSONObject("integrity")
            val message = listOf(integrity.getString("aadSha256"), integrity.getString("ciphertextSha256"),
                envelope.getJSONObject("crypto").getString("tag")).joinToString("|")
            return Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(key, "HmacSHA256")) }
                .doFinal(message.toByteArray(Charsets.UTF_8))
        } finally { key?.fill(0); secret.fill(0) }
    }
}
