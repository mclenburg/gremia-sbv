package de.gremia.sbv.companion.data.transfer

import android.annotation.SuppressLint
import android.content.Context
import de.gremia.sbv.companion.data.security.AndroidSecretBox
import de.gremia.sbv.companion.data.security.commitOrThrow
import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import de.gremia.sbv.companion.domain.transfer.X25519IdentityFactory
import de.gremia.sbv.companion.domain.transfer.formatRecipientToken
import org.json.JSONObject

class TransferIdentityRepository(
    context: Context,
    private val secretBox: AndroidSecretBox = AndroidSecretBox(),
    private val identityFactory: X25519IdentityFactory = X25519IdentityFactory(),
) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun getOrCreate(): TransferIdentity {
        val stored = preferences.getString(IDENTITY_KEY, null)
        if (stored != null) {
            return runCatching { decode(secretBox.decrypt(stored)) }
                .getOrElse { cause ->
                    throw IllegalStateException(
                        "Gespeicherte App-Identität konnte nicht gelesen werden.",
                        cause,
                    )
                }
        }
        val created = identityFactory.create()
        preferences.edit()
            .putString(IDENTITY_KEY, secretBox.encrypt(encode(created)))
            .commitOrThrow("Die Geräteidentität konnte nicht dauerhaft gespeichert werden.")
        return created
    }

    @SuppressLint("ApplySharedPref")
    fun clear() {
        preferences.edit().remove(IDENTITY_KEY)
            .commitOrThrow("Die Geräteidentität konnte nicht gelöscht werden.")
        secretBox.deleteKey()
    }

    private fun encode(identity: TransferIdentity): String =
        JSONObject()
            .put("version", 1)
            .put("instanceId", identity.instanceId)
            .put("keyFingerprint", identity.keyFingerprint)
            .put("publicKeyPem", identity.publicKeyPem)
            .put("privateKeyPem", identity.privateKeyPem)
            .put("createdAt", identity.createdAt)
            .toString()

    private fun decode(value: String): TransferIdentity {
        val json = JSONObject(value)
        require(json.getInt("version") == 1) { "Nicht unterstützte App-Identität." }
        val identity = TransferIdentity(
            instanceId = json.getString("instanceId"),
            keyFingerprint = json.getString("keyFingerprint"),
            publicKeyPem = json.getString("publicKeyPem"),
            privateKeyPem = json.getString("privateKeyPem"),
            recipientToken = "",
            createdAt = json.getString("createdAt"),
        )
        return identity.copy(recipientToken = formatRecipientToken(identity))
    }

    private companion object {
        private const val PREFERENCES_NAME = "gremia_sbv_companion_identity"
        private const val IDENTITY_KEY = "transfer_identity_v1"
    }
}
