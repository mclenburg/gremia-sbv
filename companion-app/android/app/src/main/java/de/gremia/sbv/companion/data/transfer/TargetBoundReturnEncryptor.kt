package de.gremia.sbv.companion.data.transfer

import de.gremia.sbv.companion.domain.mobile.MobileReturnTarget
import de.gremia.sbv.companion.domain.mobile.sha256
import de.gremia.sbv.companion.domain.transfer.pemBlock
import org.bouncycastle.asn1.ASN1ObjectIdentifier
import org.bouncycastle.asn1.x509.AlgorithmIdentifier
import org.bouncycastle.asn1.x509.SubjectPublicKeyInfo
import org.bouncycastle.crypto.params.X25519PrivateKeyParameters
import org.json.JSONObject
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

class TargetBoundReturnEncryptor(
    private val random: SecureRandom = SecureRandom(),
) {
    fun encrypt(
        payloadText: String,
        packageId: String,
        createdAt: String,
        target: MobileReturnTarget,
    ): String {
        val ephemeralPrivate = X25519PrivateKeyParameters(random)
        val ephemeralPublicPem = ephemeralPublicPem(ephemeralPrivate)
        val salt = ByteArray(16).also(random::nextBytes)
        val iv = ByteArray(12).also(random::nextBytes)
        val sharedSecret = TransferKeyDerivation.sharedSecret(ephemeralPrivate, target.publicKeyPem)
        val key = TransferKeyDerivation.deriveKey(sharedSecret, salt, "gremia-sbv-transfer-key-only:${target.instanceId}:$packageId")
        return try {
            val header = Header(packageId, createdAt, target, ephemeralPublicPem, salt, iv)
            val aad = buildAad(header).toByteArray(Charsets.UTF_8)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
            cipher.updateAAD(aad)
            val sealed = cipher.doFinal(payloadText.toByteArray(Charsets.UTF_8))
            val cipherText = sealed.copyOfRange(0, sealed.size - TAG_BYTES)
            val tag = sealed.copyOfRange(sealed.size - TAG_BYTES, sealed.size)
            JSONObject()
                .put("format", RETURN_FORMAT)
                .put("version", 1)
                .put("packageId", packageId)
                .put("createdAt", createdAt)
                .put("recipientBinding", JSONObject()
                    .put("scheme", "x25519-hkdf-sha256")
                    .put("targetInstanceId", target.instanceId)
                    .put("targetKeyFingerprint", target.keyFingerprint)
                    .put("ephemeralPublicKeyPem", ephemeralPublicPem))
                .put("crypto", JSONObject()
                    .put("algorithm", "aes-256-gcm")
                    .put("kdf", "hkdf-sha256")
                    .put("salt", encoder.encodeToString(salt))
                    .put("iv", encoder.encodeToString(iv))
                    .put("tag", encoder.encodeToString(tag)))
                .put("integrity", JSONObject()
                    .put("aadSha256", sha256(aad))
                    .put("ciphertextSha256", sha256(cipherText)))
                .put("payload", encoder.encodeToString(cipherText))
                .toString()
        } finally {
            key.fill(0)
            sharedSecret.fill(0)
            salt.fill(0)
            iv.fill(0)
        }
    }

    private fun ephemeralPublicPem(privateKey: X25519PrivateKeyParameters): String {
        val publicDer = SubjectPublicKeyInfo(
            AlgorithmIdentifier(X25519_OBJECT_IDENTIFIER),
            privateKey.generatePublicKey().encoded,
        ).encoded
        return pemBlock("PUBLIC KEY", publicDer)
    }

    private fun buildAad(header: Header): String =
        "{" +
            "\"format\":\"$RETURN_FORMAT\"," +
            "\"version\":1," +
            "\"packageId\":\"${escapeJson(header.packageId)}\"," +
            "\"createdAt\":\"${escapeJson(header.createdAt)}\"," +
            "\"expiresAt\":null," +
            "\"recipientBinding\":{" +
            "\"scheme\":\"x25519-hkdf-sha256\"," +
            "\"targetInstanceId\":\"${escapeJson(header.target.instanceId)}\"," +
            "\"targetKeyFingerprint\":\"${escapeJson(header.target.keyFingerprint)}\"," +
            "\"ephemeralPublicKeyPem\":\"${escapeJson(header.ephemeralPublicKeyPem)}\"" +
            "}," +
            "\"crypto\":{" +
            "\"algorithm\":\"aes-256-gcm\"," +
            "\"kdf\":\"hkdf-sha256\"," +
            "\"kdfParams\":null," +
            "\"salt\":\"${encoder.encodeToString(header.salt)}\"," +
            "\"iv\":\"${encoder.encodeToString(header.iv)}\"" +
            "}" +
            "}"

    private fun escapeJson(value: String): String =
        JSONObject.quote(value).removePrefix("\"").removeSuffix("\"")

    private data class Header(
        val packageId: String,
        val createdAt: String,
        val target: MobileReturnTarget,
        val ephemeralPublicKeyPem: String,
        val salt: ByteArray,
        val iv: ByteArray,
    )

    private companion object {
        private const val RETURN_FORMAT = "gremia-sbv-mobile-return"
        private const val TAG_BYTES = 16
        private val encoder = Base64.getEncoder()
        private val X25519_OBJECT_IDENTIFIER = ASN1ObjectIdentifier("1.3.101.110")
    }
}
