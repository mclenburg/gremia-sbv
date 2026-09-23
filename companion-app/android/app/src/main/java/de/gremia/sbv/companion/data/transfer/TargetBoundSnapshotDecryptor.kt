package de.gremia.sbv.companion.data.transfer

import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotEnvelopeDecryptor
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotPayloadDecoder
import de.gremia.sbv.companion.domain.mobile.sha256
import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import org.json.JSONObject
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec

class TargetBoundSnapshotDecryptor(
    private val trustedDesktop: () -> de.gremia.sbv.companion.domain.transfer.TransferRecipientPublicIdentity?,
    private val payloadDecoder: MobileSnapshotPayloadDecoder = MobileSnapshotPayloadDecoder(),
) : MobileSnapshotEnvelopeDecryptor {
    override fun decryptSnapshotEnvelope(envelopeText: String, identity: TransferIdentity): MobileSnapshot {
        val envelope = JSONObject(envelopeText)
        require(envelope.getString("format") == SNAPSHOT_FORMAT) {
            "Die Datei ist keine Mobile-Projektion."
        }
        require(envelope.getInt("version") == 1) {
            "Die Mobile-Projektion nutzt keine unterstützte Version."
        }
        val packageId = envelope.getString("packageId")
        val binding = envelope.getJSONObject("recipientBinding")
        require(binding.getString("scheme") == "x25519-hkdf-sha256") {
            "Die Mobile-Projektion nutzt keine unterstützte Zielbindung."
        }
        require(binding.getString("targetInstanceId") == identity.instanceId) {
            "Die Mobile-Projektion ist nicht für dieses Mobilgerät bestimmt."
        }
        require(binding.getString("targetKeyFingerprint").equals(identity.keyFingerprint, ignoreCase = true)) {
            "Die Mobile-Projektion passt nicht zur App-Empfängerkennung."
        }
        val crypto = envelope.getJSONObject("crypto")
        require(crypto.getString("algorithm") == "aes-256-gcm" && crypto.getString("kdf") == "hkdf-sha256") {
            "Die Mobile-Projektion nutzt keine unterstützte Verschlüsselung."
        }
        val aad = buildAad(envelope, binding, crypto).toByteArray(Charsets.UTF_8)
        val integrity = envelope.getJSONObject("integrity")
        require(integrity.getString("aadSha256").equals(sha256(aad), ignoreCase = true)) {
            "Die Mobile-Projektion enthält widersprüchliche Kopfdaten."
        }
        MobileTransferOriginProof.verify(envelope, identity, trustedDesktop(), MobileTransferPurpose.SNAPSHOT)
        val ciphertext = Base64.getDecoder().decode(envelope.getString("payload"))
        require(integrity.getString("ciphertextSha256").equals(sha256(ciphertext), ignoreCase = true)) {
            "Die Mobile-Projektion enthält beschädigte Nutzdaten."
        }
        val salt = Base64.getDecoder().decode(crypto.getString("salt"))
        val iv = Base64.getDecoder().decode(crypto.getString("iv"))
        val tag = Base64.getDecoder().decode(crypto.getString("tag"))
        val sharedSecret = TransferKeyDerivation.sharedSecret(identity.privateKeyPem, binding.getString("ephemeralPublicKeyPem"))
        val key = TransferKeyDerivation.deriveKey(sharedSecret, salt, "gremia-sbv-transfer-key-only:${identity.instanceId}:$packageId")
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, javax.crypto.spec.SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
            cipher.updateAAD(aad)
            val plain = cipher.doFinal(ciphertext + tag)
            payloadDecoder.decodeWrappedPayload(String(plain, Charsets.UTF_8))
        } finally {
            key.fill(0)
            sharedSecret.fill(0)
        }
    }

    private fun buildAad(envelope: JSONObject, binding: JSONObject, crypto: JSONObject): String {
        val expiresAt = if (envelope.has("expiresAt") && !envelope.isNull("expiresAt")) {
            "\"${escapeJson(envelope.getString("expiresAt"))}\""
        } else {
            "null"
        }
        return "{" +
            "\"format\":\"${escapeJson(envelope.getString("format"))}\"," +
            "\"version\":${envelope.getInt("version")}," +
            "\"packageId\":\"${escapeJson(envelope.getString("packageId"))}\"," +
            "\"createdAt\":\"${escapeJson(envelope.getString("createdAt"))}\"," +
            "\"expiresAt\":$expiresAt," +
            "\"recipientBinding\":{" +
            "\"scheme\":\"${escapeJson(binding.getString("scheme"))}\"," +
            "\"targetInstanceId\":\"${escapeJson(binding.getString("targetInstanceId"))}\"," +
            "\"targetKeyFingerprint\":\"${escapeJson(binding.getString("targetKeyFingerprint"))}\"," +
            "\"ephemeralPublicKeyPem\":\"${escapeJson(binding.getString("ephemeralPublicKeyPem"))}\"" +
            "}," +
            "\"crypto\":{" +
            "\"algorithm\":\"${escapeJson(crypto.getString("algorithm"))}\"," +
            "\"kdf\":\"${escapeJson(crypto.getString("kdf"))}\"," +
            "\"kdfParams\":null," +
            "\"salt\":\"${escapeJson(crypto.getString("salt"))}\"," +
            "\"iv\":\"${escapeJson(crypto.getString("iv"))}\"" +
            "}" +
            "}"
    }

    private fun escapeJson(value: String): String =
        JSONObject.quote(value).removePrefix("\"").removeSuffix("\"")

    private companion object {
        private const val SNAPSHOT_FORMAT = "gremia-sbv-mobile-snapshot"
    }
}
