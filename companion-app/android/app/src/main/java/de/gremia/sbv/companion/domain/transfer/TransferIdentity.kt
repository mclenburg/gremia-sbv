package de.gremia.sbv.companion.domain.transfer

data class TransferIdentity(
    val instanceId: String,
    val keyFingerprint: String,
    val publicKeyPem: String,
    val privateKeyPem: String,
    val recipientToken: String,
    val createdAt: String,
)
