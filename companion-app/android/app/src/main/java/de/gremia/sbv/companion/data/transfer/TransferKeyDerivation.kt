package de.gremia.sbv.companion.data.transfer

import org.bouncycastle.crypto.agreement.X25519Agreement
import org.bouncycastle.crypto.digests.SHA256Digest
import org.bouncycastle.crypto.generators.HKDFBytesGenerator
import org.bouncycastle.crypto.params.HKDFParameters
import org.bouncycastle.crypto.params.X25519PrivateKeyParameters
import org.bouncycastle.crypto.params.X25519PublicKeyParameters
import org.bouncycastle.crypto.util.PrivateKeyFactory
import org.bouncycastle.crypto.util.PublicKeyFactory
import java.util.Base64

internal object TransferKeyDerivation {
    fun sharedSecret(privatePem: String, publicPem: String): ByteArray =
        sharedSecret(PrivateKeyFactory.createKey(pemBytes(privatePem)) as X25519PrivateKeyParameters, publicPem)

    fun sharedSecret(privateKey: X25519PrivateKeyParameters, publicPem: String): ByteArray {
        val publicKey = PublicKeyFactory.createKey(pemBytes(publicPem)) as X25519PublicKeyParameters
        return ByteArray(32).also { secret ->
            X25519Agreement().apply { init(privateKey); calculateAgreement(publicKey, secret, 0) }
        }
    }

    fun deriveKey(secret: ByteArray, salt: ByteArray, info: String): ByteArray {
        val generator = HKDFBytesGenerator(SHA256Digest())
        generator.init(HKDFParameters(secret, salt, info.toByteArray(Charsets.UTF_8)))
        return ByteArray(32).also { generator.generateBytes(it, 0, it.size) }
    }

    private fun pemBytes(pem: String): ByteArray = Base64.getMimeDecoder().decode(
        pem.lineSequence().filterNot { it.startsWith("-----") }.joinToString(""),
    )
}
