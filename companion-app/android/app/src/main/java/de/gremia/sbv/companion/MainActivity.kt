package de.gremia.sbv.companion

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import de.gremia.sbv.companion.data.transfer.TransferIdentityRepository
import de.gremia.sbv.companion.ui.AppShellRenderer

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val identity = TransferIdentityRepository(this).getOrCreate()
        setContentView(AppShellRenderer(this).render(identity) {
            copyRecipientToken(identity.recipientToken)
        })
    }

    private fun copyRecipientToken(recipientToken: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText(getString(R.string.recipient_token_label), recipientToken))
        Toast.makeText(this, R.string.recipient_token_copied, Toast.LENGTH_SHORT).show()
    }
}
