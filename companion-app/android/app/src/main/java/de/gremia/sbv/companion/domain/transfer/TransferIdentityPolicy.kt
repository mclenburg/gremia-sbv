package de.gremia.sbv.companion.domain.transfer

import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

private const val TOKEN_PREFIX = "GSBV1"
private const val INSTANCE_ID_LENGTH = 5
private const val INSTANCE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
private val INSTANCE_ID_PATTERN = Regex("^[A-HJ-NP-Z2-9]{5}$")

fun createInstanceId(random: SecureRandom = SecureRandom()): String =
    buildString(INSTANCE_ID_LENGTH) {
        repeat(INSTANCE_ID_LENGTH) {
            append(INSTANCE_ID_ALPHABET[random.nextInt(INSTANCE_ID_ALPHABET.length)])
        }
    }

fun requireValidInstanceId(value: String) {
    require(INSTANCE_ID_PATTERN.matches(value)) {
        "Empfängerkennung enthält keine gültige 5-stellige Instanz-ID."
    }
}

fun createTransferKeyFingerprint(publicKeyPem: String): String {
    val bytes = MessageDigest
        .getInstance("SHA-256")
        .digest(publicKeyPem.toByteArray(StandardCharsets.UTF_8))
    return bytes.joinToString(separator = "") { byte -> "%02x".format(byte) }
}

fun formatRecipientToken(identity: TransferIdentity): String {
    requireValidInstanceId(identity.instanceId)
    val expectedFingerprint = createTransferKeyFingerprint(identity.publicKeyPem)
    require(identity.keyFingerprint == expectedFingerprint) {
        "Empfängerkennung enthält keinen passenden Schlüssel-Fingerprint."
    }
    val encodedPublicKey = Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(identity.publicKeyPem.toByteArray(StandardCharsets.UTF_8))
    return listOf(TOKEN_PREFIX, identity.instanceId, identity.keyFingerprint, encodedPublicKey).joinToString(".")
}

fun parseRecipientToken(token: String): TransferRecipientPublicIdentity {
    val parts = token.trim().split(".")
    require(parts.size == 4 && parts[0] == TOKEN_PREFIX) { "Empfängerkennung ist ungültig." }
    val instanceId = parts[1]
    val keyFingerprint = parts[2].lowercase()
    requireValidInstanceId(instanceId)
    require(Regex("^[0-9a-f]{64}$").matches(keyFingerprint)) {
        "Empfängerkennung enthält keinen gültigen Schlüssel-Fingerprint."
    }
    val publicKeyPem = runCatching {
        String(Base64.getUrlDecoder().decode(parts[3]), StandardCharsets.UTF_8)
    }.getOrElse {
        throw IllegalArgumentException("Empfängerkennung enthält keinen gültigen öffentlichen Schlüssel.")
    }
    require(publicKeyPem.contains("PUBLIC KEY") && createTransferKeyFingerprint(publicKeyPem) == keyFingerprint) {
        "Empfängerkennung enthält keinen passenden öffentlichen Schlüssel."
    }
    return TransferRecipientPublicIdentity(
        instanceId = instanceId,
        keyFingerprint = keyFingerprint,
        publicKeyPem = publicKeyPem,
        recipientToken = listOf(
            TOKEN_PREFIX,
            instanceId,
            keyFingerprint,
            Base64.getUrlEncoder().withoutPadding().encodeToString(publicKeyPem.toByteArray(StandardCharsets.UTF_8)),
        ).joinToString("."),
    )
}

fun pemBlock(label: String, der: ByteArray): String {
    val body = Base64.getMimeEncoder(64, "\n".toByteArray(StandardCharsets.US_ASCII)).encodeToString(der)
    return "-----BEGIN $label-----\n$body\n-----END $label-----\n"
}

data class TransferRecipientPublicIdentity(
    val instanceId: String,
    val keyFingerprint: String,
    val publicKeyPem: String,
    val recipientToken: String,
)
