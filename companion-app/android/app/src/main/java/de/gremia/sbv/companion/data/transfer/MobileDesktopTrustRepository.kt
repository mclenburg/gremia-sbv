package de.gremia.sbv.companion.data.transfer

import android.annotation.SuppressLint
import android.content.Context
import de.gremia.sbv.companion.data.security.AndroidSecretBox
import de.gremia.sbv.companion.domain.mobile.MobileDesktopTrustStore
import de.gremia.sbv.companion.domain.mobile.TrustedMobileDesktop
import de.gremia.sbv.companion.domain.transfer.parseRecipientToken
import org.json.JSONObject

class MobileDesktopTrustRepository(context: Context) : MobileDesktopTrustStore {
    private val preferences = context.getSharedPreferences("gremia_mobile_trust", Context.MODE_PRIVATE)
    private val secretBox = AndroidSecretBox("gremia_mobile_trust_v1")
    private var confirmed = load()

    override fun current(): TrustedMobileDesktop? = confirmed

    private fun load(): TrustedMobileDesktop? {
        val stored = preferences.getString("desktop", null) ?: return null
        val json = JSONObject(secretBox.decrypt(stored))
        return TrustedMobileDesktop(parseRecipientToken(json.getString("recipientToken")), json.getString("confirmedAt"))
    }

    @SuppressLint("ApplySharedPref")
    override fun save(value: TrustedMobileDesktop) {
        val json = JSONObject().put("recipientToken", value.identity.recipientToken).put("confirmedAt", value.confirmedAt)
        check(preferences.edit().putString("desktop", secretBox.encrypt(json.toString())).commit()) {
            "Die bestätigte Kopplung konnte nicht gespeichert werden. Bitte erneut bestätigen."
        }
        confirmed = value
    }

    @SuppressLint("ApplySharedPref")
    override fun clear() {
        check(preferences.edit().clear().commit()) { "Die Kopplung konnte nicht entfernt werden." }
        confirmed = null
        secretBox.deleteKey()
    }
}
