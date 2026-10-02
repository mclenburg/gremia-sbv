package de.gremia.sbv.companion.domain.transfer

import org.bouncycastle.asn1.DEROctetString
import org.bouncycastle.asn1.ASN1ObjectIdentifier
import org.bouncycastle.asn1.pkcs.PrivateKeyInfo
import org.bouncycastle.asn1.x509.AlgorithmIdentifier
import org.bouncycastle.asn1.x509.SubjectPublicKeyInfo
import org.bouncycastle.crypto.params.X25519PrivateKeyParameters
import java.security.SecureRandom
import java.time.Instant

class X25519IdentityFactory(
    private val random: SecureRandom = SecureRandom(),
) {
    fun create(): TransferIdentity {
        val privateKey = X25519PrivateKeyParameters(random)
        val publicKey = privateKey.generatePublicKey()
        val publicKeyDer = SubjectPublicKeyInfo(
            AlgorithmIdentifier(X25519_OBJECT_IDENTIFIER),
            publicKey.encoded,
        ).encoded
        val privateKeyDer = PrivateKeyInfo(
            AlgorithmIdentifier(X25519_OBJECT_IDENTIFIER),
            DEROctetString(privateKey.encoded),
        ).encoded
        val publicKeyPem = pemBlock("PUBLIC KEY", publicKeyDer)
        val identity = TransferIdentity(
            instanceId = createInstanceId(random),
            keyFingerprint = createTransferKeyFingerprint(publicKeyPem),
            publicKeyPem = publicKeyPem,
            privateKeyPem = pemBlock("PRIVATE KEY", privateKeyDer),
            recipientToken = "",
            createdAt = Instant.now().toString(),
        )
        return identity.copy(recipientToken = formatRecipientToken(identity))
    }

    private companion object {
        private val X25519_OBJECT_IDENTIFIER = ASN1ObjectIdentifier("1.3.101.110")
    }
}
